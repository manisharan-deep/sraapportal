// Sequelize User model
const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");

const UserModel = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
      },
      password: {
        type: DataTypes.STRING(200),
        allowNull: false
      },
      role: {
        type: DataTypes.ENUM("admin", "user"),
        defaultValue: "user"
      }
    },
    {
      tableName: "users",
      timestamps: true,
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            user.password = await bcrypt.hash(user.password, 12);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed("password")) {
            user.password = await bcrypt.hash(user.password, 12);
          }
        }
      }
    }
  );

  User.prototype.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate, this.password);
  };

  return User;
};

module.exports = UserModel;

// Sequelize Task model
const { DataTypes } = require("sequelize");

const TaskModel = (sequelize) => {
  const Task = sequelize.define(
    "Task",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM("Pending", "In Progress", "Completed"),
        defaultValue: "Pending"
      },
      assignedToId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      createdById: {
        type: DataTypes.UUID,
        allowNull: false
      }
    },
    {
      tableName: "tasks",
      timestamps: true
    }
  );

  return Task;
};

module.exports = TaskModel;

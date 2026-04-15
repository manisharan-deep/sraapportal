// Initialize Sequelize models and associations
const sequelize = require("../config/sequelize");
const UserModel = require("./User");
const TaskModel = require("./Task");

let User;
let Task;

const initModels = () => {
  User = UserModel(sequelize);
  Task = TaskModel(sequelize);

  User.hasMany(Task, { as: "assignedTasks", foreignKey: "assignedToId" });
  User.hasMany(Task, { as: "createdTasks", foreignKey: "createdById" });
  Task.belongsTo(User, { as: "assignedTo", foreignKey: "assignedToId" });
  Task.belongsTo(User, { as: "createdBy", foreignKey: "createdById" });

  return { User, Task };
};

module.exports = {
  initModels,
  get User() {
    return User;
  },
  get Task() {
    return Task;
  }
};

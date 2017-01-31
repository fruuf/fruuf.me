import Sequelize from 'sequelize';
import path from 'path';

const storage = path.join(process.cwd(), 'db.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
});

export const project = sequelize.define('project', {
  title: Sequelize.STRING,
  description: Sequelize.TEXT,
});

export const task = sequelize.define('task', {
  title: Sequelize.STRING,
  description: Sequelize.TEXT,
  deadline: Sequelize.DATE,
});

export const db = sequelize.sync({ force: true }).then(() => sequelize);

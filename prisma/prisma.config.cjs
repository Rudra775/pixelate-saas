require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

module.exports = {
  schema: 'schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
};

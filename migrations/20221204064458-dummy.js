module.exports = {
  async up(db, client) {
    await db.collection('albums').insertOne({artist: 'The Beatles'});
  },

  async down(db, client) {
    await db.collection('albums').deleteOne({artist: 'The Beatles'});
  }
};

const pg = require('pg');
const db = new pg.Client('postgresql://localhost/messagely');
db.connect();

const { SECRET_KEY, BCRYPT_WORK_ROUNDS } = require('../config.js');
const bcrypt = require('bcrypt');

// ** Message class for message.ly * /

/** Message on the site. */

class Message {
  constructor({ id, from_user, to_user, body, sent_at, read_at }) {
    this.id = id;
    this.from_user = from_user;
    this.to_user = to_user;
    this.sent_at = sent_at;
    this.read_at = read_at;
  }

  /** register new message -- returns
   *    {id, from_username, to_username, body, sent_at}
   */

  static async create({ from_username, to_username, body }) {
    const result = await db.query(
      `INSERT INTO messages(from_username, to_username, body, sent_at)
    VALUES ($1, $2, $3, current_timestamp) 
    RETURNING from_username, to_username, body, sent_at`,
      [from_username, to_username, body]
    );
    return result.rows[0];
  }

  /** Update read_at for message */

  static async markRead(id) {
    const result = await db.query(
      `UPDATE messages SET read_at=current_timestamp WHERE id = $1
      RETURNING id, read_at`,
      [id]
    );

    if (result.rows.length === 0) {
      const notFoundError = new Error(`Message not found`);
      notFoundError.status = 404;
    }
    return result.rows[0];
  }

  /** Get: get message by id
   *
   * returns {id, from_user, to_user, body, sent_at, read_at}
   *
   * both to_user and from_user = {username, first_name, last_name, phone}
   */

  static async get(id) {
    const result = await db.query(
      `select ufrom.username AS from_username, ufrom.first_name AS from_firstname, ufrom.last_name AS from_lastname,
     ufrom.phone AS from_phone , uto.username AS to_username, 
    uto.first_name AS to_first_name, uto.last_name AS to_lastname, uto.phone AS to_phone, 
    m.id, m.from_username, m.to_username, m.body, m.sent_at, m.read_at 
    from messages m JOIN users ufrom 
    ON m.from_username=ufrom.username 
    JOIN users uto 
    ON m.to_username=uto.username 
    WHERE m.id=$1`,
      [id]
    );

    let message = result.rows[0];

    if (message.length === 0) {
      const notFoundError = new Error(`Message not found`);
      notFoundError.status = 404;
    }
    return {
      id: message.id,
      from_user: {
        username: message.from_username,
        first_name: message.from_firstname,
        last_name: message.from_lastname,
        phone: message.from_phone
      },
      to_user: {
        username: message.to_username,
        first_name: message.to_username,
        last_name: message.to_lastname,
        phone: message.to_phone
      },
      body: message.body,
      sent_at: message.sent_at,
      read_at: message.read_at
    };
  }
}

module.exports = Message;

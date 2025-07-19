/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('users', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('username').notNullable().unique();
      table.string('password').notNullable();
      table.string('interchange').notNullable();
    })
    .createTable('vehicle_entries', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('number_plate').notNullable();
      table.string('entry_interchange').notNullable();
      table.timestamp('entry_date_time').notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('vehicle_entries')
    .dropTableIfExists('users');
};

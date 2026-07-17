-- Document-number sequences.
--
-- `nextval` is atomic and does not take a transaction-scoped lock, so
-- concurrent sales never contend on numbering. Replaces the ReceiptCounter
-- table, whose row lock serialized every sale for the day.
CREATE SEQUENCE IF NOT EXISTS "receipt_number_seq" START 1;
CREATE SEQUENCE IF NOT EXISTS "order_number_seq" START 1;
CREATE SEQUENCE IF NOT EXISTS "return_number_seq" START 1;
CREATE SEQUENCE IF NOT EXISTS "transfer_number_seq" START 1;
CREATE SEQUENCE IF NOT EXISTS "po_number_seq" START 1;

DROP TABLE IF EXISTS "ReceiptCounter";

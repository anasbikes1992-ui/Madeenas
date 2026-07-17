-- A customer's ledger may legitimately go negative: a store-credit refund to a
-- customer who owes nothing leaves the shop owing them. The original
-- non-negative constraint made that impossible to record, which is why the
-- store-credit refund path was a silent no-op.
--
-- Sign convention: totalOwed > 0 => customer owes the shop.
--                  totalOwed < 0 => customer holds store credit.
ALTER TABLE "CreditLedger" DROP CONSTRAINT IF EXISTS "CreditLedger_totalOwed_non_negative";

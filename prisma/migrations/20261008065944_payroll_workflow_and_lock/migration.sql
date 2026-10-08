-- AlterTable
ALTER TABLE "PayrollRun" ADD COLUMN     "apitBrackets" JSONB,
ADD COLUMN     "returnNote" TEXT,
ADD COLUMN     "returnedAt" TIMESTAMP(3),
ADD COLUMN     "returnedById" TEXT;

-- ---------------------------------------------------------------------------
-- Approved payroll is locked AT THE DATABASE LEVEL.
--
-- Like a posted journal, an APPROVED payroll run and its items/lines can never
-- be changed or deleted — even by a bug in the app or someone editing the
-- database directly. Corrections belong in a later month's run.
--
-- The only exception is the demo seed script, which wipes all data. It opts in
-- for its own transaction with:  SELECT set_config('paylanka.allow_purge', 'on', true)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION paylanka_purge_allowed() RETURNS boolean AS $$
  SELECT coalesce(current_setting('paylanka.allow_purge', true), '') = 'on';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION paylanka_lock_approved_run() RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'APPROVED' AND NOT paylanka_purge_allowed() THEN
    RAISE EXCEPTION 'Payroll run % is approved and locked; it cannot be changed or deleted', OLD."id"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payroll_run_locked
  BEFORE UPDATE OR DELETE ON "PayrollRun"
  FOR EACH ROW EXECUTE FUNCTION paylanka_lock_approved_run();

CREATE OR REPLACE FUNCTION paylanka_lock_approved_item() RETURNS trigger AS $$
DECLARE
  run_status "PayrollStatus";
BEGIN
  IF paylanka_purge_allowed() THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  SELECT r."status" INTO run_status FROM "PayrollRun" r
    WHERE r."id" = CASE WHEN TG_OP = 'DELETE' THEN OLD."runId" ELSE NEW."runId" END;
  IF run_status = 'APPROVED' THEN
    RAISE EXCEPTION 'Payroll items of an approved run are locked' USING ERRCODE = 'check_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payroll_item_locked
  BEFORE INSERT OR UPDATE OR DELETE ON "PayrollItem"
  FOR EACH ROW EXECUTE FUNCTION paylanka_lock_approved_item();

CREATE OR REPLACE FUNCTION paylanka_lock_approved_line() RETURNS trigger AS $$
DECLARE
  run_status "PayrollStatus";
BEGIN
  IF paylanka_purge_allowed() THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  SELECT r."status" INTO run_status
    FROM "PayrollItem" i JOIN "PayrollRun" r ON r."id" = i."runId"
    WHERE i."id" = CASE WHEN TG_OP = 'DELETE' THEN OLD."itemId" ELSE NEW."itemId" END;
  IF run_status = 'APPROVED' THEN
    RAISE EXCEPTION 'Payslip lines of an approved run are locked' USING ERRCODE = 'check_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payroll_item_line_locked
  BEFORE INSERT OR UPDATE OR DELETE ON "PayrollItemLine"
  FOR EACH ROW EXECUTE FUNCTION paylanka_lock_approved_line();

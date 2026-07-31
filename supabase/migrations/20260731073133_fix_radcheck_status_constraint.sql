/*
# Fix radcheck status constraint
The voucher statuses 'used' and 'unused' were not in the check constraint.
*/
ALTER TABLE radcheck DROP CONSTRAINT IF EXISTS radcheck_status_check;
ALTER TABLE radcheck ADD CONSTRAINT radcheck_status_check
  CHECK (status IN ('active','disabled','expired','used','unused'));

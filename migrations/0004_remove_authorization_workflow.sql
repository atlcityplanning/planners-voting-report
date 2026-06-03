DELETE FROM review_tokens WHERE purpose = 'authorize';

UPDATE voting_reports
SET status = 'submitted_for_review'
WHERE status IN ('approved_for_chair', 'chair_authorized');

DROP TABLE IF EXISTS authorization_records;

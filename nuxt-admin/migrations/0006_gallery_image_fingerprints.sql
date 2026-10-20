-- Advisory visual fingerprints; duplicate gallery records remain allowed by explicit choice.
CREATE TABLE gallery_image_fingerprints (
  source_url TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  hash TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  red REAL NOT NULL,
  green REAL NOT NULL,
  blue REAL NOT NULL,
  deviation REAL NOT NULL,
  checked_at TEXT NOT NULL,
  PRIMARY KEY (source_url, algorithm)
);

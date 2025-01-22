DROP TABLE IF EXISTS NewsCollection;
CREATE TABLE IF NOT EXISTS NewsCollection (
    Feed VARCHAR(255),
    Title VARCHAR(2083),
    Link VARCHAR(2083) PRIMARY KEY,
    pubDate DATETIME,
    Id VARCHAR(2083),
    Description TEXT,
    Content TEXT
);
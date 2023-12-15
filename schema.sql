CREATE TABLE user (
    username VARCHAR(20) NOT NULL,
    pw_hash VARCHAR(60) NOT NULL,
    -- pw_hash CHAR(60) NOT NULL,
    PRIMARY KEY(username)
);

CREATE TABLE post (
    id INT AUTO_INCREMENT,
    username VARCHAR(20) NOT NULL,
    content VARCHAR(300),
    time_posted TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    FOREIGN KEY(username) REFERENCES user(username)
);

CREATE TABLE liked (
    username VARCHAR(20) NOT NULL,
    post_id INT,
    FOREIGN KEY(username) REFERENCES user(username),
    FOREIGN KEY(post_id) REFERENCES post(id)
);
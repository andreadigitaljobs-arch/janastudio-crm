SELECT name, encode(name::bytea, 'hex') FROM janastudio.services WHERE name LIKE '%Depilaci%';

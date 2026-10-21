-- O cargo de voluntário passou a se chamar 'voluntario' (antes 'usuario').
UPDATE "users" SET "cargo" = 'voluntario' WHERE "cargo" = 'usuario';

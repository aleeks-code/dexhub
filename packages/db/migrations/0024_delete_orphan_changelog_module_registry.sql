-- Custom SQL migration file, put your code below! --
-- Rimuove riga orfana 'changelog' da module_registry: nessun manifest sorgente,
-- non in MODULE_FACTORIES (module-bootstrapper.tsx), changelog non è un modulo
-- del catalogo. Idempotente: 0 righe colpite se già assente.
DELETE FROM "module_registry" WHERE "id" = 'changelog';
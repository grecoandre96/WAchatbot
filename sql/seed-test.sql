INSERT INTO leads (first_name, last_name, email, phone, business_desc)
VALUES ('Mario', 'Rossi', 'mario@example.com', '+393331234567', 'Agenzia di marketing digitale');

INSERT INTO conversations (lead_id, status, score, outcome)
VALUES (
  (SELECT id FROM leads WHERE email = 'mario@example.com'),
  'completed', 8, 'zoom_call'
);

INSERT INTO messages (conversation_id, direction, body) VALUES
  ((SELECT id FROM conversations LIMIT 1), 'outbound', 'Ciao Mario! Ho visto che ti occupi di Agenzia di marketing digitale. Qual è la sfida principale che stai cercando di risolvere?'),
  ((SELECT id FROM conversations LIMIT 1), 'inbound',  'Voglio automatizzare la lead generation per i miei clienti.'),
  ((SELECT id FROM conversations LIMIT 1), 'outbound', 'Ottimo! Hai già un budget allocato per questo tipo di soluzione?');

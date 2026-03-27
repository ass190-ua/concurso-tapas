-- RESET DATABASE SCRIPT
-- Peligro: Esto borrará todos los datos de votaciones existentes.

-- 1. Limpieza (Orden inverso por claves foráneas)
DROP TABLE IF EXISTS user_rankings;
DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS tapas;
DROP TABLE IF EXISTS users;

-- 2. Creación de Tablas
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  event_password TEXT NOT NULL
);

CREATE TABLE tapas (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  photo_url TEXT NOT NULL,
  creator_username TEXT NOT NULL
);

CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  tapa_id INTEGER REFERENCES tapas(id),
  voting_username TEXT NOT NULL,
  score_visual INTEGER NOT NULL CHECK (score_visual >= 1 AND score_visual <= 5),
  score_sabor INTEGER NOT NULL CHECK (score_sabor >= 1 AND score_sabor <= 5),
  score_originalidad INTEGER NOT NULL CHECK (score_originalidad >= 1 AND score_originalidad <= 5),
  score_final INTEGER NOT NULL CHECK (score_final >= 1 AND score_final <= 5),
  UNIQUE(tapa_id, voting_username)
);

-- Rankings table to store ordered list
CREATE TABLE IF NOT EXISTS user_rankings (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL REFERENCES users(username),
  tapa_ids INTEGER[] NOT NULL -- Ordered list of tapa IDs
);

-- 3. Seguridad (RLS)
ALTER TABLE tapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read access on tapas" ON tapas FOR SELECT USING (true);
CREATE POLICY "Allow all read access on users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow all access on votes" ON votes FOR ALL USING (true);
CREATE POLICY "Allow all access on user_rankings" ON user_rankings FOR ALL USING (true);

-- 4. Inserción de Usuarios Reales
INSERT INTO users (username, event_password) VALUES 
('Arturo', 'tapas26'),
('Cristina', 'tapas26'),
('Anna', 'tapas26'),
('Brian', 'tapas26'),
('Araceli', 'tapas26'),
('Ari', 'tapas26'),
('Mamá de Ari', 'tapas26'),
('Paula', 'tapas26'),
('Samu', 'tapas26');

-- 5. Inserción de Tapas Reales (Con URLs de Storage)
INSERT INTO tapas (title, description, photo_url, creator_username) VALUES 
('Tapa de Arturo', '', 'https://khvtpraxyrlvpnfaihyq.supabase.co/storage/v1/object/public/fotos/Arturo.jpeg', 'Arturo'),
('Tapa de Cristina', '', 'https://khvtpraxyrlvpnfaihyq.supabase.co/storage/v1/object/public/fotos/Cristina.jpeg', 'Cristina'),
('Tapa de Anna', '', 'https://khvtpraxyrlvpnfaihyq.supabase.co/storage/v1/object/public/fotos/Anna.png', 'Anna'),
('Tapa de Brian', '', 'https://khvtpraxyrlvpnfaihyq.supabase.co/storage/v1/object/public/fotos/Brian.jpeg', 'Brian'),
('Tapa de Araceli', '', 'https://khvtpraxyrlvpnfaihyq.supabase.co/storage/v1/object/public/fotos/Araceli.png', 'Araceli'),
('Tapa de Ari', '', 'https://khvtpraxyrlvpnfaihyq.supabase.co/storage/v1/object/public/fotos/Ari.jpeg', 'Ari'),
('Tapa de Mamá de Ari', '', 'https://khvtpraxyrlvpnfaihyq.supabase.co/storage/v1/object/public/fotos/MamadeAri.jpeg', 'Mamá de Ari'),
('Tapa de Paula', '', 'https://khvtpraxyrlvpnfaihyq.supabase.co/storage/v1/object/public/fotos/Paula.jpeg', 'Paula'),
('Tapa de Samu', '', 'https://khvtpraxyrlvpnfaihyq.supabase.co/storage/v1/object/public/fotos/Samu.jpeg', 'Samu');

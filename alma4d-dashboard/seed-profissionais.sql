-- 🧪 Script de Dados de Teste para Profissionais

-- Limpar dados existentes (cuidado em produção!)
-- DELETE FROM profissionais;

-- Inserir profissionais de teste
INSERT INTO profissionais (
  nome,
  especialidade,
  documento,
  calendly_url,
  bio_resumida,
  foto_url,
  website_url,
  linkedin_url,
  instagram_url,
  whatsapp_url,
  numero_conselho,
  ativo
) VALUES
-- Profissional 1: CPF válido
(
  'Dr. João Silva',
  'Psicologia Clínica',
  '12345678909', -- CPF com dígitos válidos
  'https://calendly.com/joao-silva',
  'Especialista em terapia cognitiva comportamental com 15 anos de experiência',
  'https://via.placeholder.com/150?text=Joao',
  'https://joaosilva.com.br',
  'https://linkedin.com/in/joao-silva',
  'https://instagram.com/drjoaosilva',
  'https://wa.me/5511987654321',
  '12345/SP',
  true
),
-- Profissional 2: CNPJ válido
(
  'Dra. Maria Santos',
  'Coaching Executivo',
  '34028316000152', -- CNPJ válido
  'https://calendly.com/maria-santos',
  'Coach certificada em liderança e desenvolvimento pessoal',
  'https://via.placeholder.com/150?text=Maria',
  'https://mariasantos.coach',
  'https://linkedin.com/in/maria-santos',
  'https://instagram.com/mariacoach',
  'https://wa.me/5511998765432',
  NULL,
  true
),
-- Profissional 3: Inativo
(
  'Prof. Carlos Oliveira',
  'Educação Física',
  '45678901234',
  'https://calendly.com/carlos-oliveira',
  'Professor de educação física e preparador físico',
  'https://via.placeholder.com/150?text=Carlos',
  'https://carlosedufica.com',
  'https://linkedin.com/in/carlos-oliveira',
  'https://instagram.com/carlosfit',
  'https://wa.me/5511991234567',
  '98765/RJ',
  false -- Inativo para testar filtro
),
-- Profissional 4: Campos opcionais vazios
(
  'Dra. Ana Costa',
  'Nutrição Clínica',
  '56789012345',
  'https://calendly.com/ana-costa',
  NULL, -- Sem bio
  NULL, -- Sem foto
  NULL,
  NULL,
  NULL,
  NULL,
  '54321/MG',
  true
);

-- Verificar dados inseridos
SELECT id, nome, especialidade, documento, ativo, created_at FROM profissionais;

-- Contar totais
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN ativo = true THEN 1 ELSE 0 END) as ativos,
  SUM(CASE WHEN ativo = false THEN 1 ELSE 0 END) as inativos
FROM profissionais;

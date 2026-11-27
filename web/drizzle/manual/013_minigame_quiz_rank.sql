-- 013_minigame_quiz_rank.sql
-- Mini game diário de perguntas e respostas (5 opções) para os servos, com
-- ranking mensal (dia 1 até o último dia do mês) e perda de pontos caso não
-- entre todos os dias.
-- Idempotente.

BEGIN;

CREATE TABLE IF NOT EXISTS "quiz_questions" (
  "id" serial PRIMARY KEY,
  "day_of_month" integer UNIQUE,
  "question" text NOT NULL,
  "option_a" text NOT NULL,
  "option_b" text NOT NULL,
  "option_c" text NOT NULL,
  "option_d" text NOT NULL,
  "option_e" text NOT NULL,
  "correct_option" integer NOT NULL,
  "explanation" text NOT NULL,
  "points" integer DEFAULT 100 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "quiz_rankings" (
  "id" serial PRIMARY KEY,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "church_id" integer NOT NULL REFERENCES "churches"("id") ON DELETE CASCADE,
  "month_key" text NOT NULL,
  "points" integer DEFAULT 0 NOT NULL,
  "streak_days" integer DEFAULT 0 NOT NULL,
  "correct_count" integer DEFAULT 0 NOT NULL,
  "answered_count" integer DEFAULT 0 NOT NULL,
  "last_active_date" date,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "quiz_rankings_user_month_unique"
  ON "quiz_rankings" ("user_id", "month_key");

CREATE TABLE IF NOT EXISTS "quiz_daily_answers" (
  "id" serial PRIMARY KEY,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "question_id" integer NOT NULL REFERENCES "quiz_questions"("id") ON DELETE CASCADE,
  "answer_date" date NOT NULL,
  "month_key" text NOT NULL,
  "selected_option" integer NOT NULL,
  "is_correct" boolean NOT NULL,
  "points_earned" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "quiz_daily_answers_user_date_unique"
  ON "quiz_daily_answers" ("user_id", "answer_date");

-- Banco de 31 perguntas bíblicas e ministeriais (uma para cada dia do mês, 1 a 31),
-- cada uma com 5 opções (0 = A, 1 = B, 2 = C, 3 = D, 4 = E).
INSERT INTO "quiz_questions" ("day_of_month", "question", "option_a", "option_b", "option_c", "option_d", "option_e", "correct_option", "explanation", "points")
VALUES
  (1, 'Segundo Marcos 10:45, qual foi o propósito declarado por Jesus sobre Sua vinda?', 'Ser servido pelos reis da terra', 'Julgar imediatamente as nações', 'Servir e dar a Sua vida em resgate por muitos', 'Construir um templo físico em Jerusalém', 'Estabelecer um reino político romano', 2, '“Pois nem mesmo o Filho do Homem veio para ser servido, mas para servir e dar a sua vida em resgate por muitos.” (Marcos 10:45)', 100),
  (2, 'Em 1 Pedro 4:10, como devemos administrar o dom que recebemos de Deus?', 'Guardando o dom apenas para momentos especiais', 'Servindo uns aos outros como bons despenseiros da multiforme graça de Deus', 'Comparando nosso dom com o dos outros irmãos', 'Usando o dom apenas quando formos reconhecidos', 'Cobrando retribuição de quem recebe nosso serviço', 1, '“Cada um exerça o dom que recebeu para servir aos outros, administrando fielmente a graça de Deus em suas múltiplas formas.” (1 Pedro 4:10)', 100),
  (3, 'Quem foi escolhido junto com Estêvão entre os sete homens de boa reputação para servir às mesas em Atos 6?', 'Paulo de Tarso', 'Barnabé', 'Filipe', 'Timóteo', 'Silas', 2, 'Em Atos 6:5 foram escolhidos Estêvão, Filipe, Prócoro, Nicanor, Timom, Pármenas e Nicolau para o serviço diaconal.', 100),
  (4, 'De acordo com Colossenses 3:23, com qual atitude devemos realizar todo o nosso trabalho e serviço?', 'Com pressa para terminar logo', 'Apenas quando o líder estiver olhando', 'De todo o coração, como para o Senhor e não para os homens', 'Buscando elogios diante da congregação', 'Por obrigação ao calendário da igreja', 2, '“Tudo o que fizerem, façam-no de todo o coração, como para o Senhor, e não para os homens.” (Colossenses 3:23)', 100),
  (5, 'Qual rei de Israel organizou os levitas em 24 turnos e escalas para o ministério de louvor e serviço na Casa do Senhor?', 'Saul', 'Davi', 'Roboão', 'Acabe', 'Jeroboão', 1, 'Em 1 Crônicas 24 e 25, o rei Davi organizou os sacerdotes, músicos e levitas em turnos e escalas para o serviço contínuo.', 100),
  (6, 'Na última ceia (João 13), qual gesto prático Jesus realizou para ensinar humildade e serviço aos discípulos?', 'Multiplicou pães e peixes', 'Lavou os pés dos discípulos', 'Ungiu a cabeça de Pedro com óleo', 'Escreveu os dez mandamentos em tábuas', 'Acalmou a tempestade no mar', 1, 'Jesus levantou-se da ceia, cingiu-se com uma toalha e lavou os pés dos discípulos, dizendo: “Dei-lhes o exemplo para que façam como lhes fiz.” (João 13:14-15)', 100),
  (7, 'Em Josué 24:15, qual foi a famosa declaração de Josué diante do povo de Israel?', '“Cada um cuide apenas da sua própria tenda”', '“Eu e a minha família serviremos ao Senhor”', '“Serviremos ao Senhor somente nos dias de festa”', '“Confiaremos na força dos nossos carros de guerra”', '“Voltaremos para o Egito em busca de pão”', 1, '“Escolham hoje a quem irão servir... Mas eu e a minha família serviremos ao Senhor.” (Josué 24:15)', 100),
  (8, 'Qual profeta respondeu ao chamado de Deus no templo dizendo: “Eis-me aqui, envia-me a mim”?', 'Jonas', 'Isaías', 'Amós', 'Ageu', 'Malaquias', 1, '“Depois ouvi a voz do Senhor, que dizia: A quem enviarei, e quem há de ir por nós? Então disse eu: Eis-me aqui, envia-me a mim.” (Isaías 6:8)', 100),
  (9, 'Segundo Gálatas 5:13, para que fomos chamados à liberdade em Cristo?', 'Para fazermos tudo o que a carne deseja', 'Para não precisarmos mais congregar', 'Para servirmos uns aos outros mediante o amor', 'Para vivermos isolados da comunidade', 'Para julgarmos os irmãos mais novos na fé', 2, '“Irmãos, vocês foram chamados para a liberdade. Mas não usem a liberdade para dar ocasião à vontade da carne; ao contrário, sirvam uns aos outros mediante o amor.” (Gálatas 5:13)', 100),
  (10, 'Em Romanos 12:11, qual é a exortação do apóstolo Paulo sobre o zelo e o serviço ao Senhor?', '“Sede mornos para evitar fadiga”', '“Nunca vos falte o zelo, sede fervorosos no espírito, servindo ao Senhor”', '“Servi apenas quando houver abundância”', '“Descansai do serviço espiritual na juventude”', '“Deixai o serviço apenas para os apóstolos”', 1, '“Nunca lhes falte o zelo, sejam fervorosos no espírito, sirvam ao Senhor.” (Romanos 12:11)', 100),
  (11, 'Qual era a função de Neemias na corte do rei Artaxerxes antes de liderar a reconstrução dos muros de Jerusalém?', 'General do exército persa', 'Copeiro do rei', 'Escriba do templo', 'Tesoureiro da Babilônia', 'Mercador de especiarias', 1, 'Neemias servia como copeiro do rei (Neemias 1:11) e usou sua posição de confiança para interceder por Jerusalém.', 100),
  (12, 'Na parábola dos talentos (Mateus 25), o que o senhor disse ao servo que foi fiel no pouco?', '“Guarda o teu talento debaixo da terra”', '“Muito bem, servo bom e fiel! Foste fiel no pouco, sobre o muito te colocarei”', '“Não precisas mais trabalhar na minha casa”', '“Entrega tudo ao servo que teve medo”', '“O pouco não tem valor no meu reino”', 1, '“O seu senhor respondeu: Muito bem, servo bom e fiel! Você foi fiel no pouco; eu o porei sobre o muito. Venha e participe da alegria do seu senhor!” (Mateus 25:21)', 100),
  (13, 'Em 1 Coríntios 12, com o que Paulo compara a Igreja para explicar que todos os membros e ministérios são necessários?', 'Com uma fortaleza de pedra', 'Com o corpo humano, que tem muitos membros', 'Com um navio mercante', 'Com uma biblioteca de pergaminhos', 'Com um deserto silencioso', 1, '“Ora, vocês são o corpo de Cristo, e cada um de vocês, individualmente, é membro desse corpo.” (1 Coríntios 12:27)', 100),
  (14, 'Quem sustentava as mãos de Moisés levantadas durante a batalha contra os amalequitas em Êxodo 17?', 'Josué e Calebe', 'Arão e Hur', 'Gérson e Eliézer', 'Nadabe e Abiú', ' Corá e Datã', 1, 'Arão e Hur colocaram uma pedra para Moisés sentar e sustentaram suas mãos, um de cada lado, até o pôr do sol (Êxodo 17:12).', 100),
  (15, 'Segundo Salmos 100:2, como devemos servir ao Senhor e entrar na Sua presença?', 'Com tristeza e peso', 'Com alegria e cânticos de júbilo', 'Em silêncio absoluto sem música', 'Apenas uma vez por ano', 'Com receio e distância', 1, '“Servi ao Senhor com alegria; apresentai-vos diante dele com cântico.” (Salmos 100:2)', 100),
  (16, 'Em Lucas 10:38-42, quais eram as duas irmãs de Lázaro que receberam Jesus em sua casa em Betânia?', 'Rute e Noemi', 'Marta e Maria', 'Ana e Penina', 'Raquel e Lia', 'Priscila e Febe', 1, 'Marta ocupava-se com muitos serviços da casa, enquanto Maria sentou-se aos pés de Jesus para ouvi-lo (Lucas 10:38-42).', 100),
  (17, 'De acordo com 1 Coríntios 15:58, por que devemos ser firmes, constantes e sempre abundantes na obra do Senhor?', 'Porque o trabalho espiritual é fácil e rápido', 'Porque sabemos que, no Senhor, o nosso trabalho não é vão', 'Porque receberemos riquezas materiais imediatas', 'Porque nunca enfrentaremos dificuldades', 'Porque os homens sempre agradecerão', 1, '“Portanto, meus amados irmãos, mantenham-se firmes, e que nada os abale. Sejam sempre dedicados à obra do Senhor, pois vocês sabem que, no Senhor, o trabalho de vocês não será inútil.” (1 Coríntios 15:58)', 100),
  (18, 'Quem foi o jovem discípulo que serviu ao lado do apóstolo Paulo como um filho na fé e recebeu duas cartas pastorais no Novo Testamento?', 'Apolo', 'Timóteo', 'Filemom', 'Demas', 'Alexandre', 1, 'Paulo escreveu a 1ª e a 2ª Carta a Timóteo, elogiando sua fidelidade no serviço ao Evangelho (Filipenses 2:22).', 100),
  (19, 'Em Efésios 4:11-12, qual é o objetivo dos dons ministeriais concedidos por Cristo à Igreja?', 'Concentrar todo o trabalho em uma só pessoa', 'Aperfeiçoar os santos para o desempenho do seu serviço e edificação do corpo de Cristo', 'Criar competição entre os setores', 'Substituir a comunhão presencial', 'Dispensar os membros do serviço cristão', 1, '“Com vistas ao aperfeiçoamento dos santos para o desempenho do seu serviço, para a edificação do corpo de Cristo.” (Efésios 4:12)', 100),
  (20, 'Em 1 Samuel 3, quem servia ao Senhor ainda jovem no templo sob a supervisão do sacerdote Eli?', 'Davi', 'Samuel', 'Salomão', 'Ezequias', 'Josias', 1, '“O jovem Samuel servia ao Senhor sob a direção de Eli.” (1 Samuel 3:1)', 100),
  (21, 'Segundo João 12:26, qual é a promessa de Jesus para aquele que O serve e O segue?', 'Terá palácios terrenos em Jerusalém', '“Onde Eu estiver, ali estará também o meu servo. E, se alguém me servir, meu Pai o honrará”', 'Nunca passará por nenhuma tribulação', 'Será maior que os profetas antigos em riquezas', 'Não precisará perdoar seus irmãos', 1, '“Quem me serve precisa seguir-me; e, onde estou, o meu servo também estará. Aquele que me serve, meu Pai o honrará.” (João 12:26)', 100),
  (22, 'Qual casal do Novo Testamento fabricava tendas, trabalhou com Paulo e abriu sua casa para a igreja se reunir?', 'Ananias e Safira', 'Áquila e Priscila', 'Zacarias e Isabel', 'Herodes e Herodias', 'Félix e Drusila', 1, 'Áquila e Priscila foram colaboradores fiéis de Paulo e hospedaram a igreja em sua casa (Romanos 16:3-5).', 100),
  (23, 'Em Gálatas 6:9, qual é o conselho bíblico para quem está servindo e fazendo o bem?', 'Desistir na primeira crítica', 'Não nos cansemos de fazer o bem, pois no tempo próprio colheremos, se não desanimarmos', 'Fazer o bem apenas a quem nos elogia', 'Esperar que outros façam primeiro', 'Guardar os talentos para si mesmo', 1, '“E não nos cansemos de fazer o bem, pois no tempo próprio colheremos, se não desanimarmos.” (Gálatas 6:9)', 100),
  (24, 'Quem eram os três principais músicos/chefes de louvor nomeados por Davi para ministrar diante da Arca do Senhor em 1 Crônicas 15 e 16?', 'Corá, Merari e Gérson', 'Asafe, Hemã e Jedutum (Etã)', 'Joabe, Abisai e Asael', 'Zadoque, Abiatar e Finéias', 'Natã, Gade e Aías', 1, 'Davi designou Asafe, Hemã e Jedutum (Etã) para dirigirem o canto, as harpas, címbalos e trombetas no serviço de adoração.', 100),
  (25, 'De acordo com 1 Coríntios 14:40, como todas as coisas devem ser feitas no culto e na igreja?', 'De qualquer maneira, no improviso', 'Com decência e ordem', 'Apenas conforme a tradição humana', 'Em segredo entre poucos líderes', 'Sem planejamento de horários', 1, '“Mas tudo deve ser feito com decência e ordem.” (1 Coríntios 14:40)', 100),
  (26, 'Na parábola do Bom Samaritano (Lucas 10), o que diferenciou o samaritano do sacerdote e do levita que passaram pela estrada?', 'Ele tinha mais pressa que os outros', 'Ele moveu-se de íntima compaixão, cuidou das feridas e serviu ao próximo', 'Ele chamou os soldados romanos e foi embora', 'Ele cobrou dinheiro do homem ferido', 'Ele apenas orou de longe sem parar', 1, 'O samaritano viu o ferido, moveu-se de compaixão, atou-lhe as feridas e cuidou dele na hospedaria (Lucas 10:33-35).', 100),
  (27, 'Em Filipenses 2:3-4, como Paulo ensina que devemos tratar os outros membros da equipe e da igreja?', 'Buscando vanglória e disputando posição', 'Com humildade, considerando os outros superiores a si mesmo e olhando também para o interesse alheio', 'Ignorando as necessidades dos outros setores', 'Impondo nossa vontade pela força', 'Fazendo apenas o mínimo necessário', 1, '“Nada façam por ambição egoísta ou por vaidade, mas humildemente considerem os outros superiores a si mesmos.” (Filipenses 2:3)', 100),
  (28, 'Qual mulher de Jope, também chamada Dorcas, era conhecida por estar cheia de boas obras e costurar túnicas para ajudar os necessitados em Atos 9?', 'Lídia', 'Tabita', 'Febe', 'Cloe', 'Eunice', 1, 'Tabita (que traduzido é Dorcas) era notável pelas boas obras e esmolas que fazia na comunidade cristã de Jope (Atos 9:36).', 100),
  (29, 'Segundo Hebreus 6:10, do que Deus nunca Se esquece?', 'Das falhas que já foram perdoadas', 'Da obra de vocês e do amor que demonstraram para com o Seu nome, pois serviram e continuam servindo aos santos', 'Da riqueza material de cada cidade', 'Dos títulos acadêmicos dos escribas', 'Das muralhas dos impérios antigos', 1, '“Deus não é injusto para se esquecer do trabalho de vocês e do amor que demonstraram por ele, pois ajudaram os santos e continuam a ajudá-los.” (Hebreus 6:10)', 100),
  (30, 'Quem auxiliou Moisés como seu servidor desde jovem e depois o sucedeu na liderança do povo de Israel?', 'Calebe', 'Josué, filho de Num', 'Finéias', 'Otoniel', 'Gideão', 1, 'Josué, filho de Num, começou como servidor e auxiliar fiel de Moisés (Êxodo 33:11) antes de liderar Israel na entrada em Canaã.', 100),
  (31, 'De acordo com 1 Samuel 12:24, qual é o motivo pelo qual devemos temer ao Senhor e servi-Lo fielmente de todo o coração?', 'Para evitarmos trabalhar durante a semana', 'Considerando quão grandes coisas Ele fez por nós', 'Para sermos famosos entre os povos', 'Apenas por costume familiar', 'Para acumularmos ouro e prata', 1, '“Mas, acima de tudo, temam o Senhor e o sirvam com fidelidade e de todo o coração; considerem quão grandes coisas ele fez por vocês.” (1 Samuel 12:24)', 100)
ON CONFLICT ("day_of_month") DO NOTHING;

COMMIT;

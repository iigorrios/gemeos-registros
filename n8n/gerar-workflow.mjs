import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const OUT = process.argv[2]
const ORIG = JSON.parse(readFileSync(process.argv[3], 'utf8'))

const SUPA = { supabaseApi: { id: 'hCxNEoX0lNOsC9qu', name: 'Supabase Igor Rios' } }
const OPENAI = { openAiApi: { id: 'lbtw7CCqDKEaoffp', name: 'OpenAi Igor Rios' } }

/** Reaproveita um nó do workflow original, sem alterações. */
const orig = (name) => {
  const n = ORIG.nodes.find((x) => x.name === name)
  if (!n) throw new Error(`nó não encontrado no original: ${name}`)
  return JSON.parse(JSON.stringify(n))
}

/* ── Código dos nós Code ──────────────────────────────────────────── */

const codeProcessarEventos = `// Roda DEPOIS de salvar a mensagem bruta, para que cada evento fique ligado
// à mensagem de origem via raw_message_id (é o que o app usa para marcar o
// registro como "veio do WhatsApp").
const raw = $('Normalizar Payload').item.json;
const rawMessageId = $json.id || null;
const parsed = $('Agente Extrator').item.json.output || { eventos: [] };

const messageTimestampUTC = DateTime.fromISO(raw.message_timestamp, { zone: 'utc' });
const messageTimestampBR = messageTimestampUTC.setZone('America/Sao_Paulo');

const babyMap = { leo: 1, clara: 2 };

function resolveOccurredAt(horarioTexto) {
  if (!horarioTexto) return messageTimestampUTC.toISO();
  const match = String(horarioTexto).match(/(\\d{1,2}):(\\d{2})/);
  if (!match) return messageTimestampUTC.toISO();

  let dt = messageTimestampBR.set({
    hour: parseInt(match[1], 10),
    minute: parseInt(match[2], 10),
    second: 0,
    millisecond: 0
  });

  // horário citado no futuro em relação à mensagem => é do dia anterior
  if (dt > messageTimestampBR) dt = dt.minus({ days: 1 });

  return dt.toUTC().toISO();
}

const semAcento = (v) =>
  String(v || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');

// Rede de segurança: mesmo que a IA escreva de outro jeito, a fralda entra
// no banco como xixi | coco | ambos — nunca em branco por variação de texto.
function normalizaFralda(valor, observacao) {
  const s = semAcento(valor) + ' ' + semAcento(observacao);
  const temXixi = /xixi|pipi|molhad|urin/.test(s);
  const temCoco = /coco|sujou|evacuou|fezes/.test(s);
  if (/ambos|os dois|tudo|completa/.test(s) || (temXixi && temCoco)) return 'ambos';
  if (temCoco) return 'coco';
  if (temXixi) return 'xixi';
  return null;
}

function normalizaLado(valor) {
  const s = semAcento(valor);
  if (/ambos|dois|os 2/.test(s)) return 'ambos';
  if (/esq/.test(s)) return 'esquerdo';
  if (/dir/.test(s)) return 'direito';
  return null;
}

const items = [];
for (const evento of (parsed.eventos || [])) {
  const occurredAt = resolveOccurredAt(evento.horario_texto);
  const babies = evento.bebe === 'ambos' ? ['leo', 'clara'] : [evento.bebe];

  // ml => mamadeira; tempo => seio. Vale mesmo se a IA não mandar "metodo".
  let metodo = evento.metodo || null;
  if (!metodo && evento.quantidade_ml != null) metodo = 'mamadeira';
  if (!metodo && evento.duracao_min != null) metodo = 'seio';

  const ehSeio = metodo === 'seio';
  const amountMl = ehSeio ? null : (evento.quantidade_ml != null ? evento.quantidade_ml : null);
  const durationMin = ehSeio ? (evento.duracao_min != null ? Math.round(evento.duracao_min) : null) : null;
  const ladoSeio = ehSeio ? normalizaLado(evento.lado_seio) : null;

  for (const nick of babies) {
    items.push({
      json: {
        ...evento,
        baby_id: babyMap[nick] || null,
        occurred_at: occurredAt,
        raw_message_id: rawMessageId,
        metodo: metodo,
        amount_ml: amountMl,
        duration_min: durationMin,
        breast_side: ladoSeio,
        fralda_tipo: evento.tipo === 'fralda'
          ? normalizaFralda(evento.fralda_tipo, evento.observacao)
          : null,
        peso_kg: evento.peso_kg != null ? evento.peso_kg : null,
        altura_cm: evento.altura_cm != null ? evento.altura_cm : null,
        ai_classification: parsed
      }
    });
  }
}
return items;`

const codeAcharSono = `const original = $('Roteador Tipo Evento').item.json;
const rows = $input.all().map(i => i.json);
const abertos = rows.filter(r => !r.ended_at);

if (abertos.length === 0) {
  // sem "dormiu" em aberto para este bebê — nada a encerrar
  return [];
}

abertos.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
const maisRecente = abertos[0];

return [{
  json: {
    id: maisRecente.id,
    ended_at: original.occurred_at
  }
}];`

const codeMontarConfirmacao = `// Recebe as LINHAS QUE O BANCO DEVOLVEU depois de inserir/atualizar, então a
// confirmação descreve o que ficou gravado de fato — não o que a IA entendeu.
// Cada tabela tem colunas próprias, e é por elas que se sabe o tipo do registro.
const rows = $input.all().map(i => i.json).filter(r => r && r.id != null);
if (rows.length === 0) return [];

const nomes = { 1: 'Léo', 2: 'Clara' };

const hora = (iso) =>
  iso ? DateTime.fromISO(iso, { zone: 'utc' }).setZone('America/Sao_Paulo').toFormat('HH:mm') : '';

function duracao(min) {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return m + 'min';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? h + 'h' : h + 'h ' + r + 'min';
}

const numero = (n) => String(n).replace('.', ',');

const fralda = { xixi: 'xixi', coco: 'cocô', ambos: 'xixi + cocô' };

const linhas = [];
for (const r of rows) {
  const quem = nomes[r.baby_id] || 'Bebê';

  if ('note' in r) {
    linhas.push('• ' + quem + ' — Anotação (' + hora(r.occurred_at) + '): ' + r.note);
  } else if ('weight_kg' in r) {
    const partes = [];
    if (r.weight_kg != null) partes.push(numero(r.weight_kg) + ' kg');
    if (r.height_cm != null) partes.push(numero(r.height_cm) + ' cm');
    linhas.push('• ' + quem + ' — Medida: ' + (partes.join(' · ') || 'sem valores'));
  } else if ('started_at' in r) {
    if (r.ended_at) {
      const min = (new Date(r.ended_at) - new Date(r.started_at)) / 60000;
      linhas.push('• ' + quem + ' — Acordou às ' + hora(r.ended_at) + ' (dormiu ' + duracao(min) + ')');
    } else {
      linhas.push('• ' + quem + ' — Dormiu às ' + hora(r.started_at));
    }
  } else if ('medication_name' in r) {
    const dose = r.dose ? ' (' + r.dose + ')' : '';
    linhas.push('• ' + quem + ' — Remédio: ' + (r.medication_name || 'sem nome') + dose + ' às ' + hora(r.occurred_at));
  } else if ('type' in r) {
    const tipo = fralda[r.type] || r.type || 'tipo não informado';
    linhas.push('• ' + quem + ' — Fralda: ' + tipo + ' às ' + hora(r.occurred_at));
  } else if ('amount_ml' in r || 'duration_min' in r) {
    let desc;
    if (r.method === 'seio') {
      const lado = r.breast_side ? ' ' + r.breast_side : '';
      const tempo = r.duration_min != null ? ' por ' + duracao(r.duration_min) : '';
      desc = 'Seio' + lado + tempo;
    } else if (r.amount_ml != null) {
      desc = 'Mamadeira ' + numero(r.amount_ml) + ' ml';
    } else {
      desc = 'Mamada';
    }
    linhas.push('• ' + quem + ' — ' + desc + ' às ' + hora(r.occurred_at));
  }
}

if (linhas.length === 0) return [];

const texto = '✅ Registrado:\\n' + linhas.join('\\n');
const chatid = $('Normalizar Payload').first().json.group_id;

return [{ json: { number: chatid, text: texto } }];`

/* ── Nós ──────────────────────────────────────────────────────────── */

const nodes = [
  // — trilhos que já existiam, sem mudança —
  orig('Webhook'),
  orig('If'),
  orig('Switch1'),
  orig('Texto Contém ARREGIMENTAÇÃO'),
  orig('Texto Contém RELATÓRIO DA CÉLULA'),
  orig('Message a model'),
  orig('Code in JavaScript2'),
  orig('Loop Over Items'),
  orig('Get a row'),
  orig('Switch'),
  orig('Create a row'),
  orig('Update a row1'),
  orig('Replace Me'),
  orig('Message a model2'),
  orig('Code in JavaScript'),
  orig('Get a row1'),
  orig('Switch2'),
  orig('Create a row1'),
  orig('Update a row'),

  // — trilho dos gêmeos —
  orig('Filtra Evento de Mensagem'),
  orig('Normalizar Payload'),
  orig('Filtra Grupo Gêmeos'),
  orig('Tem Texto?'),
  orig('Salvar Mídia'),
  orig('OpenAI Chat Model'),

  {
    parameters: {
      operation: 'get',
      tableId: 'gemeos_settings',
      filters: { conditions: [{ keyName: 'key', keyValue: 'ai_prompt' }] },
    },
    id: 'a1f0c3d2-7b64-4e51-9c28-5f1a02d7b911',
    name: 'Buscar Prompt',
    type: 'n8n-nodes-base.supabase',
    typeVersion: 1,
    position: [1264, 4176],
    credentials: SUPA,
    notes:
      'O prompt do extrator vive em gemeos_settings.ai_prompt e se edita no app (Mais > Prompt da IA). Editar lá vale já na próxima mensagem, sem tocar no n8n.',
  },

  {
    parameters: {
      schemaType: 'manual',
      inputSchema: JSON.stringify({
        type: 'object',
        properties: {
          eventos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                tipo: {
                  type: 'string',
                  enum: ['alimentacao', 'fralda', 'medicamento', 'sono', 'medida', 'anotacao', 'outro'],
                },
                bebe: { type: 'string', enum: ['leo', 'clara', 'ambos', 'desconhecido'] },
                horario_texto: { type: ['string', 'null'] },
                quantidade_ml: { type: ['number', 'null'] },
                duracao_min: { type: ['number', 'null'] },
                metodo: { type: ['string', 'null'], enum: ['seio', 'mamadeira', null] },
                lado_seio: { type: ['string', 'null'], enum: ['esquerdo', 'direito', 'ambos', null] },
                fralda_tipo: { type: ['string', 'null'], enum: ['xixi', 'coco', 'ambos', null] },
                medicamento_nome: { type: ['string', 'null'] },
                medicamento_dose: { type: ['string', 'null'] },
                peso_kg: { type: ['number', 'null'] },
                altura_cm: { type: ['number', 'null'] },
                observacao: { type: ['string', 'null'] },
                acao: { type: ['string', 'null'], enum: ['inicio', 'fim', null] },
              },
              required: ['tipo', 'bebe'],
            },
          },
        },
        required: ['eventos'],
      }),
    },
    id: 'f970ebbf-cf7c-4926-9f1f-f109955274db',
    name: 'Parser Estruturado',
    type: '@n8n/n8n-nodes-langchain.outputParserStructured',
    typeVersion: 1.2,
    position: [1456, 4400],
  },

  {
    parameters: {
      promptType: 'define',
      text: "={{ $('Normalizar Payload').item.json.message_text }}",
      hasOutputParser: true,
      messages: {
        messageValues: [{ type: 'AIMessagePromptTemplate', message: '={{ $json.value }}' }],
      },
    },
    id: 'c2ce8b18-b643-4123-9365-0e17548c91d7',
    name: 'Agente Extrator',
    type: '@n8n/n8n-nodes-langchain.chainLlm',
    typeVersion: 1.5,
    position: [1456, 4176],
    notes:
      'O system prompt vem de "Buscar Prompt" ($json.value). Atenção: chaves { } no texto do prompt são tratadas como variáveis de template pelo LangChain — evite JSON de exemplo dentro do prompt.',
  },

  {
    parameters: {
      tableId: 'gemeos_raw_messages',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'sender', fieldValue: "={{ $('Normalizar Payload').item.json.sender }}" },
          { fieldId: 'message_text', fieldValue: "={{ $('Normalizar Payload').item.json.message_text }}" },
          {
            fieldId: 'message_timestamp',
            fieldValue: "={{ $('Normalizar Payload').item.json.message_timestamp }}",
          },
          {
            fieldId: 'ai_classification',
            fieldValue: "={{ JSON.stringify($('Agente Extrator').item.json.output) }}",
          },
        ],
      },
    },
    id: '3f1d9fcc-38e6-447b-835f-8d34658db65c',
    name: 'Salvar Mensagem Bruta',
    type: 'n8n-nodes-base.supabase',
    typeVersion: 1,
    position: [1648, 4176],
    credentials: SUPA,
    notes:
      'Agora roda ANTES de processar os eventos: o id desta linha vira o raw_message_id de cada registro, ligando o evento à mensagem que o originou.',
  },

  {
    parameters: { jsCode: codeProcessarEventos },
    id: '6a9545bc-a2d4-4244-ad26-abb0bc18c032',
    name: 'Processar Eventos',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1840, 4176],
  },

  {
    parameters: {
      rules: {
        values: ['alimentacao', 'fralda', 'medicamento', 'sono', 'medida', 'anotacao'].map(
          (tipo, i) => ({
            conditions: {
              options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
              conditions: [
                {
                  id: `rt${i + 1}`,
                  leftValue: '={{ $json.tipo }}',
                  rightValue: tipo,
                  operator: { type: 'string', operation: 'equals' },
                },
              ],
              combinator: 'and',
            },
            renameOutput: true,
            outputKey: tipo,
          }),
        ),
      },
      options: { fallbackOutput: 'extra' },
    },
    id: '5d0e57c3-c77e-4fb9-8c43-a6754fce41a6',
    name: 'Roteador Tipo Evento',
    type: 'n8n-nodes-base.switch',
    typeVersion: 3.2,
    position: [2032, 4176],
  },

  {
    parameters: {
      tableId: 'gemeos_feedings',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'baby_id', fieldValue: '={{ $json.baby_id }}' },
          { fieldId: 'occurred_at', fieldValue: '={{ $json.occurred_at }}' },
          { fieldId: 'amount_ml', fieldValue: '={{ $json.amount_ml }}' },
          { fieldId: 'duration_min', fieldValue: '={{ $json.duration_min }}' },
          { fieldId: 'method', fieldValue: '={{ $json.metodo }}' },
          { fieldId: 'breast_side', fieldValue: '={{ $json.breast_side }}' },
          { fieldId: 'notes', fieldValue: '={{ $json.observacao }}' },
          { fieldId: 'raw_message_id', fieldValue: '={{ $json.raw_message_id }}' },
        ],
      },
    },
    id: 'e938cf6e-d107-49cb-bbca-1d1dd553dbeb',
    name: 'Inserir Alimentação',
    type: 'n8n-nodes-base.supabase',
    typeVersion: 1,
    position: [2256, 3952],
    credentials: SUPA,
  },

  {
    parameters: {
      tableId: 'gemeos_diaper_events',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'baby_id', fieldValue: '={{ $json.baby_id }}' },
          { fieldId: 'occurred_at', fieldValue: '={{ $json.occurred_at }}' },
          { fieldId: 'type', fieldValue: '={{ $json.fralda_tipo }}' },
          { fieldId: 'notes', fieldValue: '={{ $json.observacao }}' },
          { fieldId: 'raw_message_id', fieldValue: '={{ $json.raw_message_id }}' },
        ],
      },
    },
    id: 'bdb4af6e-046e-4cb5-8f1f-a186fcf8bee3',
    name: 'Inserir Fralda',
    type: 'n8n-nodes-base.supabase',
    typeVersion: 1,
    position: [2256, 4080],
    credentials: SUPA,
  },

  {
    parameters: {
      tableId: 'gemeos_medications',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'baby_id', fieldValue: '={{ $json.baby_id }}' },
          { fieldId: 'occurred_at', fieldValue: '={{ $json.occurred_at }}' },
          { fieldId: 'medication_name', fieldValue: '={{ $json.medicamento_nome }}' },
          { fieldId: 'dose', fieldValue: '={{ $json.medicamento_dose }}' },
          { fieldId: 'notes', fieldValue: '={{ $json.observacao }}' },
          { fieldId: 'raw_message_id', fieldValue: '={{ $json.raw_message_id }}' },
        ],
      },
    },
    id: 'a18bb194-3d07-4c77-b183-98de53e971ed',
    name: 'Inserir Medicamento',
    type: 'n8n-nodes-base.supabase',
    typeVersion: 1,
    position: [2256, 4208],
    credentials: SUPA,
  },

  {
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [
          {
            id: 's1',
            leftValue: '={{ $json.acao }}',
            rightValue: 'inicio',
            operator: { type: 'string', operation: 'equals' },
          },
        ],
        combinator: 'and',
      },
      options: {},
    },
    id: '3ac26c2e-2bc8-4359-b8cf-fdf9c6146842',
    name: 'Início ou Fim de Sono?',
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [2256, 4352],
  },

  {
    parameters: {
      tableId: 'gemeos_sleep_events',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'baby_id', fieldValue: '={{ $json.baby_id }}' },
          { fieldId: 'started_at', fieldValue: '={{ $json.occurred_at }}' },
          { fieldId: 'notes', fieldValue: '={{ $json.observacao }}' },
          { fieldId: 'raw_message_id', fieldValue: '={{ $json.raw_message_id }}' },
        ],
      },
    },
    id: '7e83b0c1-3ebd-47bc-8c0f-529b08eaf4bf',
    name: 'Inserir Início do Sono',
    type: 'n8n-nodes-base.supabase',
    typeVersion: 1,
    position: [2480, 4288],
    credentials: SUPA,
  },

  {
    parameters: {
      operation: 'getAll',
      tableId: 'gemeos_sleep_events',
      returnAll: true,
      filters: { conditions: [{ keyName: 'baby_id', keyValue: '={{ $json.baby_id }}' }] },
    },
    id: 'edc134dc-bf77-4b10-a0e3-1b050938e3ed',
    name: 'Buscar Sonos do Bebê',
    type: 'n8n-nodes-base.supabase',
    typeVersion: 1,
    position: [2480, 4432],
    credentials: SUPA,
    notes: 'Traz os sonos do bebê; o Code seguinte pega o mais recente que está sem ended_at.',
  },

  {
    parameters: { jsCode: codeAcharSono },
    id: 'c737827d-7ccb-4eb1-bf5d-85fa0d191943',
    name: 'Achar Sono Mais Recente',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [2672, 4432],
  },

  {
    parameters: {
      operation: 'update',
      tableId: 'gemeos_sleep_events',
      filters: { conditions: [{ keyName: 'id', keyValue: '={{ $json.id }}' }] },
      fieldsUi: { fieldValues: [{ fieldId: 'ended_at', fieldValue: '={{ $json.ended_at }}' }] },
    },
    id: '5fd7c5e0-c9ae-4ab8-8475-2f9388febfb2',
    name: 'Atualizar Fim do Sono',
    type: 'n8n-nodes-base.supabase',
    typeVersion: 1,
    position: [2864, 4432],
    credentials: SUPA,
  },

  {
    parameters: {
      tableId: 'gemeos_growth_measurements',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'baby_id', fieldValue: '={{ $json.baby_id }}' },
          { fieldId: 'measured_at', fieldValue: '={{ $json.occurred_at }}' },
          { fieldId: 'weight_kg', fieldValue: '={{ $json.peso_kg }}' },
          { fieldId: 'height_cm', fieldValue: '={{ $json.altura_cm }}' },
          { fieldId: 'notes', fieldValue: '={{ $json.observacao }}' },
          { fieldId: 'raw_message_id', fieldValue: '={{ $json.raw_message_id }}' },
        ],
      },
    },
    id: 'b5c81e44-2a37-4f6e-9d10-71c2a4e8f003',
    name: 'Inserir Medida',
    type: 'n8n-nodes-base.supabase',
    typeVersion: 1,
    position: [2256, 4496],
    credentials: SUPA,
  },

  {
    parameters: {
      tableId: 'gemeos_health_notes',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'baby_id', fieldValue: '={{ $json.baby_id }}' },
          { fieldId: 'occurred_at', fieldValue: '={{ $json.occurred_at }}' },
          {
            fieldId: 'note',
            fieldValue: "={{ $json.observacao || $('Normalizar Payload').item.json.message_text }}",
          },
          { fieldId: 'raw_message_id', fieldValue: '={{ $json.raw_message_id }}' },
        ],
      },
    },
    id: 'd2e93f17-6c85-4a20-b3f9-08ad51c7e226',
    name: 'Inserir Anotação',
    type: 'n8n-nodes-base.supabase',
    typeVersion: 1,
    position: [2256, 4624],
    credentials: SUPA,
  },

  {
    parameters: {},
    id: 'ac31b70e-9f42-4d58-8e61-2b90c5f4a137',
    name: 'Registros Gravados',
    type: 'n8n-nodes-base.noOp',
    typeVersion: 1,
    position: [3088, 4176],
    notes:
      'Ponto de encontro dos inserts. Recebe as linhas que o banco devolveu, para a confirmação falar do que realmente foi gravado.',
  },

  {
    parameters: { jsCode: codeMontarConfirmacao },
    id: 'e7a2d195-3c48-4b06-92f7-6d0184ae35b2',
    name: 'Montar Confirmação',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [3280, 4176],
  },

  {
    parameters: {
      method: 'POST',
      url: "={{ $('Webhook').item.json.body.BaseUrl }}/send/text",
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: 'token', value: "={{ $('Webhook').item.json.body.token }}" }],
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify({ number: $json.number, text: $json.text }) }}',
      options: {},
    },
    id: 'b8f4c206-5e19-47d3-a0c2-93b7150de4a8',
    name: 'Enviar Confirmação no Grupo',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [3472, 4176],
    onError: 'continueRegularOutput',
    notes:
      'BaseUrl e token saem do próprio webhook da UAZAPI — nenhum segredo fica escrito no fluxo. Falha aqui não derruba a gravação (onError: continue).',
  },
]

/* ── Ligações ─────────────────────────────────────────────────────── */

const to = (node, index = 0) => ({ node, type: 'main', index })

const connections = {
  Webhook: { main: [[to('Filtra Evento de Mensagem'), to('If')]] },

  // trilho arregimentação / células (sem os nós que guardavam a chave do banco)
  If: { main: [[to('Switch1')]] },
  Switch1: {
    main: [
      [to('Texto Contém ARREGIMENTAÇÃO'), to('Texto Contém RELATÓRIO DA CÉLULA')],
      [to('Texto Contém ARREGIMENTAÇÃO')],
      [to('Texto Contém RELATÓRIO DA CÉLULA')],
    ],
  },
  'Texto Contém ARREGIMENTAÇÃO': { main: [[to('Message a model')]] },
  'Texto Contém RELATÓRIO DA CÉLULA': { main: [[to('Message a model2')]] },
  'Message a model': { main: [[to('Code in JavaScript2')]] },
  'Code in JavaScript2': { main: [[to('Loop Over Items')]] },
  'Loop Over Items': { main: [[], [to('Get a row')]] },
  'Get a row': { main: [[to('Switch')]] },
  Switch: { main: [[to('Update a row1')], [to('Create a row')]] },
  'Create a row': { main: [[to('Replace Me')]] },
  'Update a row1': { main: [[to('Replace Me')]] },
  'Replace Me': { main: [[to('Loop Over Items')]] },
  'Message a model2': { main: [[to('Code in JavaScript')]] },
  'Code in JavaScript': { main: [[to('Get a row1')]] },
  'Get a row1': { main: [[to('Switch2')]] },
  Switch2: { main: [[to('Update a row')], [to('Create a row1')]] },

  // trilho dos gêmeos
  'Filtra Evento de Mensagem': { main: [[to('Normalizar Payload')]] },
  'Normalizar Payload': { main: [[to('Filtra Grupo Gêmeos')]] },
  'Filtra Grupo Gêmeos': { main: [[to('Tem Texto?')]] },
  'Tem Texto?': { main: [[to('Buscar Prompt')], [to('Salvar Mídia')]] },
  'Buscar Prompt': { main: [[to('Agente Extrator')]] },
  'OpenAI Chat Model': { ai_languageModel: [[{ node: 'Agente Extrator', type: 'ai_languageModel', index: 0 }]] },
  'Parser Estruturado': { ai_outputParser: [[{ node: 'Agente Extrator', type: 'ai_outputParser', index: 0 }]] },
  'Agente Extrator': { main: [[to('Salvar Mensagem Bruta')]] },
  'Salvar Mensagem Bruta': { main: [[to('Processar Eventos')]] },
  'Processar Eventos': { main: [[to('Roteador Tipo Evento')]] },
  'Roteador Tipo Evento': {
    main: [
      [to('Inserir Alimentação')],
      [to('Inserir Fralda')],
      [to('Inserir Medicamento')],
      [to('Início ou Fim de Sono?')],
      [to('Inserir Medida')],
      [to('Inserir Anotação')],
      [], // "outro": fica só na mensagem bruta
    ],
  },
  'Início ou Fim de Sono?': { main: [[to('Inserir Início do Sono')], [to('Buscar Sonos do Bebê')]] },
  'Buscar Sonos do Bebê': { main: [[to('Achar Sono Mais Recente')]] },
  'Achar Sono Mais Recente': { main: [[to('Atualizar Fim do Sono')]] },

  'Inserir Alimentação': { main: [[to('Registros Gravados')]] },
  'Inserir Fralda': { main: [[to('Registros Gravados')]] },
  'Inserir Medicamento': { main: [[to('Registros Gravados')]] },
  'Inserir Início do Sono': { main: [[to('Registros Gravados')]] },
  'Atualizar Fim do Sono': { main: [[to('Registros Gravados')]] },
  'Inserir Medida': { main: [[to('Registros Gravados')]] },
  'Inserir Anotação': { main: [[to('Registros Gravados')]] },

  'Registros Gravados': { main: [[to('Montar Confirmação')]] },
  'Montar Confirmação': { main: [[to('Enviar Confirmação no Grupo')]] },
}

const workflow = {
  name: 'Extração de dados mensagem recebida WhatsApp Igor',
  nodes,
  connections,
  active: false,
  settings: {
    executionOrder: 'v1',
    timeSavedMode: 'fixed',
    timezone: 'America/Sao_Paulo',
    callerPolicy: 'workflowsFromSameOwner',
    executionTimeout: -1,
    availableInMCP: false,
    errorWorkflow: 'HRLprHAY6qcU7T1i',
  },
  meta: { templateCredsSetupCompleted: true },
}

/* ── Validações ───────────────────────────────────────────────────── */

const nomes = new Set(nodes.map((n) => n.name))
const erros = []

if (nomes.size !== nodes.length) erros.push('nomes de nó duplicados')

const ids = new Set(nodes.map((n) => n.id))
if (ids.size !== nodes.length) erros.push('ids de nó duplicados')

for (const [origem, conns] of Object.entries(connections)) {
  if (!nomes.has(origem)) erros.push(`conexão parte de nó inexistente: ${origem}`)
  for (const tipo of Object.keys(conns)) {
    for (const saida of conns[tipo]) {
      for (const alvo of saida) {
        if (!nomes.has(alvo.node)) erros.push(`${origem} -> nó inexistente: ${alvo.node}`)
      }
    }
  }
}

const serializado = JSON.stringify(workflow, null, 2)

// Nenhum segredo do workflow antigo pode sobreviver para o novo. Os valores a
// procurar saem do próprio arquivo de entrada — nada de chave escrita aqui,
// senão o "verificador" viraria o vazamento.
const origSerializado = JSON.stringify(ORIG)
const suspeitos = new Set()

// JWTs (chaves anon e service_role do Supabase)
for (const m of origSerializado.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) {
  suspeitos.add(m[0])
}
// token da instância da UAZAPI, que vem no corpo do webhook
const tokenUazapi = ORIG.pinData?.Webhook?.[0]?.json?.body?.token
if (tokenUazapi) suspeitos.add(tokenUazapi)

for (const segredo of suspeitos) {
  if (serializado.includes(segredo)) {
    erros.push(`SEGREDO VAZANDO no JSON gerado: ${segredo.slice(0, 12)}…`)
  }
}
if (/service_role/i.test(serializado)) erros.push('menção a service_role no JSON gerado')

JSON.parse(serializado) // garante JSON válido

if (erros.length) {
  console.error('FALHAS:')
  for (const e of erros) console.error(' -', e)
  process.exit(1)
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, serializado + '\n', 'utf8')

const semSaida = nodes.filter((n) => !connections[n.name] && n.name !== 'Enviar Confirmação no Grupo' && n.name !== 'Salvar Mídia')
console.log(`OK — ${nodes.length} nós, ${Object.keys(connections).length} origens de conexão`)
console.log(`nós sem saída: ${semSaida.map((n) => n.name).join(', ') || 'nenhum'}`)
console.log(`bytes: ${serializado.length}`)

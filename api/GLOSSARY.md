# Amicats

Plataforma da ONG Amicats (resgate e abrigo de gatos em Campo Grande/MS): gestão interna do abrigo e relacionamento com o público que adota, apadrinha e apoia.

## Pessoas e acesso

**Conta**:
O cadastro de uma pessoa na plataforma, com e-mail, senha e um cargo.
_Avoid_: usuário (para designar qualquer conta), user

**Cargo**:
O nível de acesso de uma conta: adm, voluntário ou cliente. Os cargos são em camadas: cada cargo pode tudo o que os cargos abaixo dele podem.
_Avoid_: perfil, papel, role, permissão

**Adm**:
Cargo de quem administra a ONG na plataforma: gerencia contas, cargos e o catálogo de tags, além de tudo o que o voluntário faz.
_Avoid_: admin, administrador, gestor

**Voluntário**:
Cargo de quem trabalha no abrigo: cadastra e acompanha os gatos, suas fotos e sua saúde. Também pode apadrinhar e assinar, como um cliente.
_Avoid_: usuário, equipe, staff

**Cliente**:
Cargo do público externo: quem vê os gatos, adota, apadrinha ou assina o Clube Amicats.
_Avoid_: padrinho, assinante, adotante (esses são papéis que um cliente assume, não cargos)

**Convite**:
Link de uso único enviado por e-mail para que uma conta criada pelo adm defina a própria senha.

## Gatos

**Gato**:
Um animal acolhido pelo abrigo, com nome, nascimento aproximado, fotos, tags, observações e histórico de saúde.
_Avoid_: animal, pet, felino

**Status do gato**:
A situação atual do gato: disponível, apadrinhado, adotado, em tratamento ou falecido.

**Publicado**:
Indica que o gato aparece no catálogo público do site. Um gato não publicado é um rascunho visível só para voluntários e adms.
_Avoid_: ativo, visível

**Catálogo público**:
A vitrine de gatos do site, aberta a qualquer visitante, sem observações internas nem histórico de saúde.
_Avoid_: vitrine, listagem

**Nascimento aproximado**:
Data estimada de nascimento acompanhada da precisão da estimativa (dia, mês ou ano), já que a data exata costuma ser desconhecida para gatos resgatados.
_Avoid_: idade, data de nascimento

**Observações**:
Anotações internas sobre o gato (manejo, temperamento, cuidados). Nunca aparecem no catálogo público.
_Avoid_: notas, comentários

**Capa**:
A foto principal do gato, usada nos cards do catálogo. Todo gato com fotos tem exatamente uma.

## Saúde

**Tag**:
Rótulo de um catálogo comum, mantido pelo adm, que classifica uma condição do gato como doença, comportamento ou cuidado. Ex.: FIV, FeLV, esporotricose.
_Avoid_: etiqueta, marcador, categoria

**Tag ativa**:
Condição que o gato tem hoje. Uma tag inativa registra uma condição que o gato já teve.

**Registro de saúde**:
Uma entrada no histórico de saúde do gato: uma doença ou condição, com data de início, data de fim (vazia enquanto estiver em curso) e observação.
_Avoid_: prontuário, ocorrência, evento

## Medicação e veterinário

**Prescrição**:
Indicação de um medicamento para um gato: dose, via, de quantas em quantas horas, a partir de quando e até quando (sem data final = uso contínuo).
_Avoid_: receita, tratamento, remédio (para o registro)

**Dose prevista**:
Cada horário em que a prescrição manda dar o medicamento, contado a partir da primeira dose em intervalos fixos.
_Avoid_: horário, lembrete

**Aplicação**:
Registro de que uma dose prevista foi dada (ou pulada), por quem e quando.
_Avoid_: administração, baixa

**Dose pulada**:
Aplicação registrada sem o medicamento ter sido dado (ex.: o gato recusou, vomitou ou estava sem estoque), com observação do motivo.

**Remédios do dia**:
As doses previstas de todos os gatos num dia, no horário do abrigo (Campo Grande/MS), com o que já foi aplicado.
_Avoid_: agenda, escala de medicação

**Evento veterinário**:
Um atendimento ou procedimento do gato: consulta, vacina, vermífugo, exame, cirurgia ou castração, com data e, quando houver, a data de retorno.
_Avoid_: atendimento, visita, prontuário

**Retorno**:
A próxima data marcada num evento veterinário (reforço de vacina, revisão, novo exame).
_Avoid_: próxima consulta, agendamento

## Apadrinhamento

**Gasto**:
Despesa do abrigo atribuída a um gato específico (ração, medicamento, consulta, exame…), com valor e data.
_Avoid_: custo, despesa, lançamento

**Apadrinhamento**:
Compromisso de uma conta em ajudar a pagar os gastos reais de um gato específico, enquanto estiver ativo. Um gato pode ter qualquer número de padrinhos.
_Avoid_: patrocínio, adoção à distância

**Padrinho**:
Conta com um apadrinhamento ativo. Qualquer cargo pode ser padrinho.
_Avoid_: patrocinador

**Parte do padrinho**:
O que cabe a cada padrinho num mês: o total de gastos do gato naquele mês dividido igualmente entre os padrinhos daquele mês.
_Avoid_: cota, mensalidade, rateio

**Padrinhos do mês**:
Os apadrinhamentos do gato que estiveram ativos em algum dia daquele mês.

**Estimativa de custo**:
A média mensal dos gastos de um gato nos últimos 3 meses completos. Serve de referência para quem pensa em apadrinhar.
_Avoid_: custo previsto, orçamento

**Mês fechado**:
Mês que já terminou. Só a parte de meses fechados pode ser paga, porque o mês corrente ainda pode receber gastos.
_Avoid_: mês encerrado, competência

**Pagamento da parte**:
Pagamento avulso, pelo checkout do Mercado Pago (pix, cartão ou boleto), do que falta pagar da parte do padrinho num mês fechado. Pode ficar pendente, aprovado, recusado ou estornado.
_Avoid_: mensalidade, cobrança (cobrança é do Clube), fatura

**Falta pagar**:
A parte do padrinho no mês menos o que ele já pagou de forma aprovada naquele mês. Nunca é negativo: pagar a mais não vira crédito.
_Avoid_: saldo, débito, dívida

**Apadrinhado** (selo):
Indica que o gato tem pelo menos um padrinho ativo.

## Notificações

**Notificação**:
Aviso para uma conta sobre algo que aconteceu (gasto novo do gato apadrinhado, novo padrinho, dose atrasada, retorno chegando), com link para o lugar certo. Fica não lida até a pessoa abrir.
_Avoid_: alerta, mensagem, aviso

**Resumo por e-mail**:
E-mail enviado no máximo uma vez por dia com as notificações ainda não lidas, para quem não desligou essa opção.
_Avoid_: newsletter, digest

**Verificação de pendências**:
Tarefa periódica que procura doses atrasadas e retornos próximos, gera as notificações e envia os resumos por e-mail.
_Avoid_: cron, job, rotina

## Clube Amicats

**Clube Amicats**:
Programa de assinatura mensal em que a pessoa escolhe uma faixa de valor e é cobrada no cartão todo mês pelo Mercado Pago. Os sorteios entre assinantes vêm numa próxima fase.
_Avoid_: clube de assinatura, associação, mensalidade

**Faixa**:
Um plano do clube, com nome e valor mensal fixos, mantido pelo adm (ex.: Amigo, R$ 20).
_Avoid_: plano (no texto para o público), pacote, nível

**Assinatura**:
O vínculo de uma conta com uma faixa do clube. Começa pendente (até a pessoa concluir o pagamento no Mercado Pago) e pode ficar ativa, pausada ou cancelada. Guarda o valor da faixa no momento da adesão.
_Avoid_: inscrição, plano, recorrência

**Assinante**:
Conta com assinatura ativa.
_Avoid_: associado, sócio, membro

**Cobrança**:
Cada pagamento mensal de uma assinatura feito pelo Mercado Pago, aprovado ou recusado.
_Avoid_: fatura, parcela, mensalidade

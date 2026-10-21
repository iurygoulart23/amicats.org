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

## Apoio (próximas fases)

**Apadrinhamento**:
Compromisso de uma conta em custear os gastos de um gato específico, total ou parcialmente (50%).
_Avoid_: patrocínio, adoção à distância

**Padrinho**:
Conta que mantém um apadrinhamento.
_Avoid_: patrocinador

**Gasto**:
Despesa do abrigo atribuída a um gato (ração, medicamento, consulta), repassada ao padrinho.
_Avoid_: custo, despesa

**Clube Amicats**:
Programa de assinatura recorrente em que o assinante escolhe o valor mensal e concorre a sorteios.
_Avoid_: clube de assinatura, associação

**Assinante**:
Conta com assinatura ativa no Clube Amicats.
_Avoid_: associado, sócio

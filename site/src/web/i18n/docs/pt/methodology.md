---
title: Metodologia
description: Como o contributor.top seleciona e classifica os usuários do GitHub.
---

# Metodologia

## Quem é considerado

1. Para cada país, buscamos no GitHub usuários cuja **localização** no perfil corresponde ao país ou a uma de suas cidades. A lista de textos de localização de cada país fica em [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) e está aberta a pull requests.
2. A busca do GitHub não consegue ordenar por contribuições, então, entre todos que correspondem, pegamos os **1000 usuários com mais seguidores** e classificamos só eles. A página de cada país mostra quantos seguidores tem a pessoa com menos seguidores entre as consideradas.
3. Organizações e bots são excluídos.
4. Cada pessoa pertence a exatamente **um** país: o primeiro mencionado na localização do perfil. Se houver vários países, só o primeiro conta.

## O que é contado

As contribuições dos últimos 12 meses, do jeito que o GitHub as conta nos perfis:

- **Contribuições públicas**: commits, pull requests, issues e revisões visíveis para todos.
- **Todas as contribuições**: públicas mais privadas. As contribuições privadas só contam para quem escolheu mostrá-las no perfil; para os demais, esta aba mostra o mesmo número da pública.
- **Commits**: só commits públicos.

Empates são desfeitos pelo número de seguidores e, depois, pelo nome de usuário.

Abaixo de cada nome: `C` commits públicos, `PR` pull requests, `IS` issues, `RV` revisões e um cadeado para as contribuições privadas (passe o cursor para ver os números exatos). O GitHub informa a atividade privada como um único número que não pode ser detalhado nem verificado, por isso, no ranking **Todas as contribuições**, um pequeno cadeado ao lado do total marca as pessoas cujas contribuições são quase totalmente (90% ou mais) privadas. Elas não são removidas: muita gente trabalha com código fechado. O ranking principal usa apenas contribuições públicas.

Algumas contas registram um número enorme de commits e quase nenhuma outra atividade: nenhum pull request, issue ou revisão. É assim que parece um script fazendo commits no mesmo repositório o dia todo, e também uma conta cujos commits vão quase todos para um repositório próprio que ninguém mais usa. Quem faz commits diretamente num projeto de outra pessoa amplamente usado, como costumam fazer os mantenedores de grandes projetos comunitários, não é considerado automatizado. Essas contas são marcadas com um pequeno robô nos rankings dos países e ficam fora do ranking mundial e dos badges mundiais.

## Por que não estou na lista?

- A localização do seu perfil não corresponde a nenhum texto do preset do seu país. A localização é um texto livre: adicione sua cidade ou país, ou abra um pull request para o preset.
- Você não está entre os 1000 usuários com mais seguidores do seu país.
- Suas contribuições são privadas e não aparecem no seu perfil.
- Você pediu para ser removido (veja [Privacidade e exclusão](/pt/privacy/)).

## Acesso aos dados

Todo ranking também está disponível em JSON: [`/api/index.json`](/api/index.json) lista os países, e `/api/<country>.json` (por exemplo, `/api/canada.json`) contém os três rankings com posição, nome de usuário e contribuições. O ranking mundial está em [`/api/world.json`](/api/world.json). Os arquivos são estáticos e podem ser baixados de qualquer site.

Use-os para pesquisas sobre código aberto, estatísticas e projetos comunitários. Não os use para contatar pessoas em massa, para recrutamento nem para revender os dados. Quem pediu exclusão nunca é incluído.

## Atualizações

Os países são atualizados um após o outro, começando pelo que está há mais tempo sem atualização. A página de cada país mostra quando ela foi atualizada pela última vez.

Inspirado no [committers.top](https://committers.top).

---
title: Metodologia
description: Como o contributor.top seleciona e classifica os usuários do GitHub.
---

# Metodologia

## Quem é considerado

1. Para cada país, buscamos no GitHub usuários cuja **localização** no perfil corresponde ao país ou a uma de suas cidades. A lista de textos de localização de cada país fica em [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) e está aberta a pull requests.
2. A busca do GitHub não consegue ordenar por contribuições, então, entre todos que correspondem, pegamos os **{{consider}} usuários com mais seguidores** e classificamos só eles. A página de cada país mostra quantos seguidores tem a pessoa com menos seguidores entre as consideradas.
3. Organizações e bots são excluídos.
4. Cada pessoa pertence a exatamente **um** país: o primeiro mencionado na localização do perfil. Se houver vários países, só o primeiro conta.

## O que é contado

As contribuições dos últimos 12 meses, do jeito que o GitHub as conta nos perfis:

- **Contribuições públicas**: commits, pull requests, issues e revisões visíveis para todos.
- **Todas as contribuições**: públicas mais privadas. As contribuições privadas só contam para quem escolheu mostrá-las no perfil; para os demais, esta aba mostra o mesmo número da pública.
- **Commits**: só commits públicos.

Empates são desfeitos pelo número de seguidores e, depois, pelo nome de usuário.

Abaixo de cada nome: `C` commits públicos, `PR` pull requests, `IS` issues, `RV` revisões e um cadeado para as contribuições privadas (passe o cursor para ver os números exatos).

## Marcas e exclusões

Algumas regras, iguais para todos, impedem que números que não podem ser verificados, ou que um script produziu, decidam um ranking. Cada marca mostra, ao passar o cursor, a regra por trás dela e os números aos quais foi aplicada.

| Regra                  | Quando                                                                                                                                                                              | O que acontece                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Quase tudo privado     | {{private_flag}}% ou mais das contribuições são privadas                                                                                                                            | Um cadeado ao lado do total em **Todas as contribuições**        |
| Quase nada público     | As contribuições públicas são menos de {{min_public}}% do total                                                                                                                     | Fora de **Todas as contribuições**; continua nos outros rankings |
| Fazenda de commits     | {{min_commits}} commits ou mais, pelo menos {{ratio}} vezes o número de pull requests, issues e revisões somados                                                                    | Fora de todos os rankings                                        |
| Um repositório sem uso | {{min_commits}} commits ou mais, {{quiet_share}}% ou mais deles em um único repositório próprio com menos de {{quiet_stars}} estrelas                                               | O mesmo que uma fazenda de commits                               |
| Exceção                | {{popular_share}}% dos commits ou mais vão para um repositório de outra pessoa com {{popular_stars}} estrelas ou mais, ou para qualquer repositório de uma organização que tenha um | Nunca marcado como automatizado                                  |

O GitHub informa a atividade privada como um único número que não pode ser detalhado nem verificado, então ela só conta quando o trabalho público a sustenta; um cadeado sozinho não exclui ninguém, já que muita gente trabalha com código fechado. Quem faz commits diretamente em um projeto muito usado, como costumam fazer mantenedores de grandes projetos comunitários e de distribuições Linux, não é considerado automatizado: só o próprio projeto pode dar esse acesso.

## Como verificar os rankings

Os rankings seguem apenas estas regras e a ordem acima; ninguém é movido manualmente. Os limites vêm de [`config.yml`](https://github.com/contributor-top/contributor.top/blob/main/config.yml), e a única lista manual dele, `denylist_ids`, só muda por meio de um pull request público. Os números coletados de cada país estão no [branch `data`](https://github.com/contributor-top/contributor.top/tree/data) do repositório, então qualquer ranking pode ser recalculado e verificado.

## Por que não estou na lista?

- A localização do seu perfil não corresponde a nenhum texto do preset do seu país. A localização é um texto livre: adicione sua cidade ou país, ou abra um pull request para o preset.
- Você não está entre os {{consider}} usuários com mais seguidores do seu país.
- Quase todas as suas contribuições são privadas (menos de {{min_public}}% públicas): você fica de fora apenas de **Todas as contribuições**.
- Seus commits parecem automatizados (veja as regras acima): essas contas não entram em nenhum ranking.
- Suas contribuições são privadas e não aparecem no seu perfil.
- Você pediu para ser removido (veja [Privacidade e exclusão](/pt/privacy/)).

## Acesso aos dados

Todo ranking também está disponível em JSON: [`/api/index.json`](/api/index.json) lista os países, e `/api/<country>.json` (por exemplo, `/api/canada.json`) contém os três rankings com posição, nome de usuário e contribuições. O ranking mundial está em [`/api/world.json`](/api/world.json). Os arquivos são estáticos e podem ser baixados de qualquer site.

Use-os para pesquisas sobre código aberto, estatísticas e projetos comunitários. Não os use para contatar pessoas em massa, para recrutamento nem para revender os dados. Quem pediu exclusão nunca é incluído.

## Atualizações

Os países são atualizados um após o outro, começando pelo que está há mais tempo sem atualização. A página de cada país mostra quando ela foi atualizada pela última vez.

Inspirado no [committers.top](https://committers.top).

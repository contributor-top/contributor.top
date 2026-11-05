---
title: Privacidade e exclusão
description: Quais dados o contributor.top usa e como ser removido.
---

# Privacidade e exclusão

## O que usamos

Só dados públicos dos perfis do GitHub: o ID numérico da sua conta, seu nome de usuário, seu número de seguidores e suas contribuições dos últimos 12 meses. Não guardamos seu nome de exibição, e-mail, bio, empresa, status nem o texto exato da sua localização. Os dados não são vendidos nem compartilhados com recrutadores ou sites de vagas.

## Como se remover

Defina no GitHub um status com uma mensagem que contenha `contributor.top opt-out`, visível para todos, com "Clear after: Don't clear". Você será removido de todos os rankings e badges na próxima atualização do seu país (em cerca de dois dias); se a atualização do seu país continuar falhando, o status ainda é verificado no início de cada execução do coletor. Depois disso, você pode tirar o status: a exclusão continua valendo.

De propósito, não há formulário nem issue para preencher: um pedido público ligaria seu nome de usuário à remoção para sempre. O status não exige nenhum contato conosco e é lido apenas do seu próprio perfil, então ninguém pode remover ou adicionar outra pessoa.

Guardamos apenas um hash com chave do ID da sua conta, para que você não seja adicionado de novo, numa lista criptografada que é criptografada novamente a cada execução: dela não dá para saber quem saiu, quantas pessoas saíram nem quando. Para voltar, defina um status que contenha `contributor.top opt-in`.

## O que não podemos controlar

Cópias feitas antes da remoção: commits antigos do repositório público, arquivos da web, forks e caches de mecanismos de busca. Quem comparar os rankings ao longo do tempo pode ver que você não está mais na lista, como acontece com qualquer pessoa que se muda ou sai do top. Os avatares são carregados dos servidores do GitHub, e cada página consulta a API do GitHub para obter o número de estrelas do repositório, então o GitHub vê o endereço IP do visitante. O site não usa analytics nem cookies.

## Contato

Dúvidas sobre esta página: [abra uma issue](https://github.com/contributor-top/contributor.top/issues).

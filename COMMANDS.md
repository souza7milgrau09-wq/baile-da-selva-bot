# Comandos por prefixo

O prefixo padrao e `!` e pode ser alterado no painel ou com `!setprefix`.

Antes de usar, abra o painel em **Bot > Comandos** e ative:

- Ativar esta funcao
- Comandos por prefixo

Depois abra **Comandos por prefixo** no menu principal e ative somente os comandos que quiser usar. Todos ficam desativados individualmente por padrao.

## Usuario

`help`, `ping`, `avatar`, `banner`, `userinfo`, `serverinfo`, `roleinfo`, `botinfo`, `invite`, `uptime`, `stats`, `emoji`, `afk`, `perfil`

## Moderacao

`ban`, `unban`, `kick`, `mute`, `unmute`, `timeout`, `untimeout`, `warn`, `warnings`, `clear`, `lock`, `unlock`, `slowmode`, `nick`, `role`, `unrole`, `say`, `embed`, `purgebots`, `purgehumans`

## Administracao

`setprefix`, `setwelcome`, `setleave`, `setlogs`, `setautorole`, `setverify`, `settickets`, `setxp`, `backup`, `restore`

## Tickets

`ticket`, `panel`, `close`, `add`, `remove`, `rename`, `claim`, `unclaim`, `transcript`, `reopen`, `delete`

## Economia

`balance`, `daily`, `weekly`, `monthly`, `work`, `crime`, `beg`, `deposit`, `withdraw`, `pay`, `leaderboard`, `shop`, `buy`, `sell`, `inventory`, `use`

## Diversao

`8ball`, `coinflip`, `dice`, `slot`, `ship`, `gay`, `iq`, `rate`, `meme`, `cat`, `dog`, `joke`, `hack`, `kiss`, `hug`, `slap`, `poke`, `love`

## Musica

`play`, `pause`, `resume`, `stop`, `skip`, `queue`, `loop`, `shuffle`, `removetrack`, `volume`, `seek`, `nowplaying`, `lyrics`

O nome `removetrack` evita conflito com `remove`, que pertence ao sistema de tickets.

## Niveis

`rank`, `xpleaderboard`, `level`, `resetxp`, `givexp`, `removexp`

O nome `xpleaderboard` evita conflito com `leaderboard`, que pertence a economia.

## Utilidades

`poll`, `timer`, `calc`, `weather`, `translate`, `shorturl`, `color`, `qr`, `remind`, `userinfoid`, `rolelist`, `channelinfo`

## Seguranca

`lockdown`, `unlockdown`, `antiraid`, `antispam`, `automod`, `whitelist`, `blacklist`, `antinuke`

## Logs

`logs`, `modlogs`, `sniper`, `editsniper`

## Dono

`eval`, `reload`, `restart`, `shutdown`, `sync`, `deploy`, `servers`, `leave`, `announce`, `maintenance`

Cadastre os IDs autorizados em **Geral > IDs dos donos autorizados**. Sem um ID cadastrado, nenhum comando de dono funciona.

## Ajuda e permissoes

Use `!help` para abrir o menu com categorias e `!help termo` para pesquisar. Cada comando verifica permissao do membro, permissao do bot, cooldown, canal permitido, cargo permitido, blacklist e manutencao.

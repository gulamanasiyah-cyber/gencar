#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
cd /home/maula/mudamudicengkareng
nvm use default
npx @opennextjs/cloudflare build --dangerouslyUseUnsupportedNextVersion
mkdir -p open-next-assets
rsync -a --delete .open-next/assets/ open-next-assets/

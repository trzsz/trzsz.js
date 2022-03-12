# TrzszAddon example for trzsz

Simple webshell supports [trzsz](https://github.com/trzsz/trzsz). ( For security reasons, don't listen on public IP. )

If you are using [xterm-addon-attach](https://www.npmjs.com/package/xterm-addon-attach), just replace `AttachAddon` with `TrzszAddon`.

```js
import { Terminal } from 'xterm';
import { TrzszAddon } from 'trzsz';

const terminal = new Terminal();
const trzszAddon = new TrzszAddon(webSocket);
terminal.loadAddon(trzszAddon);
```

```html
<script src="node_modules/xterm/lib/xterm.js"></script>
<script src="node_modules/trzsz/lib/trzsz.js"></script>
<script>
  const terminal = new Terminal();
  const trzszAddon = new TrzszAddon(webSocket);
  terminal.loadAddon(trzszAddon);
</script>
```

If you are building an electron app, it's recommended that you refer to [electron example](../electron/README.md), which using `preload.js` to give `fs` permission to `trzsz.js`, for better user experience.


## Test Guidelines

* Start test server
```sh
git clone https://github.com/trzsz/trzsz.js.git

cd trzsz.js
npm install
npm run build

cd examples/addon
npm install
npm start
```

* Open web browser
```
http://localhost:8081
```

* Install trzsz server
```sh
sudo python -m pip install trzsz
```

* Upload files
```sh
trz
```

* Download files
```sh
tsz file1 file2
```

# Electron example for trzsz

Simple electron terminal supports [trzsz](https://github.com/trzsz/trzsz).

## Test Guidelines

* Start test app
```sh
git clone https://github.com/trzsz/trzsz.js.git

cd trzsz.js
npm install
npm run build

cd examples/electron
npm install
npm start
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

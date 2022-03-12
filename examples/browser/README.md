# Browser example for trzsz

Simple webshell supports [trzsz](https://github.com/trzsz/trzsz). ( For security reasons, don't listen on public IP. )

Recommend to use [TrzszAddon](../addon/).


## Test Guidelines

* Start test server
```sh
git clone https://github.com/trzsz/trzsz.js.git

cd trzsz.js
npm install
npm run build

cd examples/browser
npm install
npm start
```

* Open web browser
```
http://localhost:8082
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

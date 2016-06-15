# Introduction
Sweet config load file/directory configuration for you, it handle env configuration in an fixed way.

# Quick Start
Only support js/json file formats
*Install in your app directory*

```bash
npm install sweet-config
mkdir config
vi config/application.json
mkdir config/env
vi config/env/development.js
vi config/env/production
```

```javascript
// application.json
{
  "keys": ["abc", 'def']
}
```

```javascript
// env/development.js
module.exports = {
  database: {
    host: 'localhost'
  }
}
```

```javascript
// env/production
module.exports = {
  database: {
    host: '127.0.0.1'
  }
}

```

```javascript
const config = require('sweet-config')
config.load() // if not give directory or file path, will load `config` directory in project root
config.get('application.keys') // should equals to ['abc', 'def']
// sweet config will load env configuration in root
config.get('database') // should equals to {host: '127.0.0.1'} when NODE_ENV=production
```

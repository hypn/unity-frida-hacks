import { MonoApi, MonoApiHelper } from 'frida-mono-api'

let Enumerator = {
  // memory readers
  readS2:     addr => new NativePointer(addr).readShort(),
  readU2:     addr => new NativePointer(addr).readUShort(),
  readS4:     addr => new NativePointer(addr).readInt(),
  readU4:     addr => new NativePointer(addr).readUInt(),
  readS8:     addr => new NativePointer(addr).readS8(),
  readU8:     addr => new NativePointer(addr).readU8(),
  readS16:    addr => new NativePointer(addr).readS16(),
  readU16:    addr => new NativePointer(addr).readU16(),
  readS32:    addr => new NativePointer(addr).readS32(),
  readU32:    addr => new NativePointer(addr).readU32(),
  readFloat:  addr => new NativePointer(addr).readFloat(),
  readDouble: addr => new NativePointer(addr).readDouble(),

  readString: function(addr) {
    // the (unicode) string seems to start 12-16 bytes after the address/pointer
    var strStart = parseInt(addr) + 12;

    // when the 12th byte is 0x30, then the string starts at 16 bytes after the offset?
    var byte = this.readByte(strStart);
    if (byte == 0x30) {
      strStart += 4;
    }

    // hope we have the correct offset to the string and read it
    return new NativePointer(strStart).readUtf16String();
  },

  // memory writers
  writeS2:     (addr, value) => new NativePointer(addr).writeShort(value),
  writeU2:     (addr, value) => new NativePointer(addr).writeUShort(value),
  writeS4:     (addr, value) => new NativePointer(addr).writeInt(value),
  writeU4:     (addr, value) => new NativePointer(addr).writeUInt(value),
  writeS8:     (addr, value) => new NativePointer(addr).writeS8(value),
  writeU8:     (addr, value) => new NativePointer(addr).writeU8(value),
  writeS16:    (addr, value) => new NativePointer(addr).writeS16(value),
  writeU16:    (addr, value) => new NativePointer(addr).writeU16(value),
  writeS32:    (addr, value) => new NativePointer(addr).writeS32(value),
  writeU32:    (addr, value) => new NativePointer(addr).writeU32(value),
  writeShort:  (addr, value) => new NativePointer(addr).writeShort(value),
  writeUShort: (addr, value) => new NativePointer(addr).writeUShort(value),
  writeInt:    (addr, value) => new NativePointer(addr).writeInt(value),
  writeUInt:   (addr, value) => new NativePointer(addr).writeUInt(value),
  writeFloat:  (addr, value) => new NativePointer(addr).writeFloat(value),
  writeDouble: (addr, value) => new NativePointer(addr).writeDouble(value),

  // aliases
  readByte:  function(addr)        { return this.readU8(addr) },   // 1 byte
  readWord:  function(addr)        { return this.readU16(addr) },  // 2 bytes
  readDword: function(addr)        { return this.readU32(addr) },  // 4 bytes
  readQword: function(addr)        { return this.readU64(addr) },  // 8 bytes
  writeByte: function(addr, value) { return this.writeU8(addr, value) }, // 1 byte

  // field getter and setter
  getFieldValue: function(addr, type) {
    switch(type) {
      case 'boolean':
        return (this.readByte(addr) === 0x1);
        break;

      case 'char': // UNTESTED!
        return String.fromCharCode(this.readByte(addr));
        break;

      case 'i1':
        return this.readS8(addr);
        break;

      case 'u1':
        return this.readU8(addr);
        break;

      case 'i2':
        return this.readS2(addr);
        break;

      case 'u2':
        return this.readU2(addr);
        break;

      case 'i4':
        return this.readS4(addr);
        break;

      case 'u4':
        return this.readU4(addr);
        break;

      case 'i8':
        return this.readS8(addr);
        break;

      case 'u8':
        return this.readU8(addr);
        break;

      case 'float':
        return this.readFloat(addr);
        break;

      case 'string': // UNTESTED!
        console.log('trying to read string from: 0x' + addr.toString(16));
        return this.readString(addr);
        break;

      default:
        console.log('Mono type "' + type + '" not supported.');
    }
  },

  setFieldValue: function(addr, type, value) {
    switch(type) {
      case 'boolean':
        if ((value === true) || (value === false)) {
          value = (value) ? 0x1 : 0x0;
          return this.writeByte(addr, value);
        } else {
          console.log('invalid value (expected boolean): ', value)
        }
        break;

      case 'i1':
        return this.writeS8(addr, value);
        break;

      case 'u1':
        return this.writeU8(addr, value);
        break;

      case 'i2':
        return this.writeS2(addr, value);
        break;

      case 'u2':
        return this.writeU2(addr, value);
        break;

      case 'i4':
        return this.writeS4(addr, value);
        break;

      case 'u4':
        return this.writeU4(addr, value);
        break;

      case 'i8':
        return this.writeS8(addr, value);
        break;

      case 'u8':
        return this.writeU8(addr, value);
        break;

      case 'float':
        value = parseFloat(value);
        return this.writeFloat(addr, value);
        break;

      default:
        console.log('Mono type "' + type + '" not supported.');
    }
  },

  // enumerators
  getClass: function(name) {
    var k = 0;
    MonoApiHelper.AssemblyForeach(function(assemb) {
      var image = MonoApi.mono_assembly_get_image(assemb);
      var klass = MonoApiHelper.ClassFromName(image, name);
      if (klass != 0) {
        k = klass;
      }
    });
    return k;
  },

  getMethods: function(monoClass) {
    var ret = {};
    var methods = MonoApiHelper.ClassGetMethods(monoClass)
    for (var i = methods.length - 1; i >= 0; i--) {
      var method = methods[i];
      var name = MonoApiHelper.MethodGetName(method, monoClass);
      ret[name] = {
        address:     '0x' + parseInt(method).toString(16),
        jit_address: '0x' + parseInt(MonoApi.mono_compile_method(method)).toString(16)
      };
    }
    return ret;
  },

  getFieldType: function(field) {
    // hex values 0x00 - 0x21, from https://github.com/royal1948/cheat-engine/blob/25e75246f40988482fa1ae842008c0a6d2f1e25e/Cheat%20Engine/bin/autorun/monoscript.lua
    const types = ['end', 'void', 'boolean', 'char', 'i1', 'u1', 'i2', 'u2', 'i4', 'u4', 'i8', 'u8', 'float', 'r8', 'string', 'ptr', 'byref', 'valuetype', 'class', 'var', 'array', 'genericinst', 'typedbyref', 'i', 'u', 'fnptr', 'object', 'szarray', 'mvar', 'cmod_reqd', 'cmod_opt', 'internal'];
    var monoValue = MonoApi.mono_type_get_type(MonoApi.mono_field_get_type(field));
    if (monoValue == 0x55) {
      return 'enum';
    } else {
      return types[monoValue] || 'UNKNOWN! ' + monoValue.toString(16);
    }
  },

  getFields: function(monoClass) {
    var ret = {};
    var fields = MonoApiHelper.ClassGetFields(monoClass)
    for (var i = fields.length - 1; i >= 0; i--) {
      var field = fields[i];
      var name = MonoApiHelper.FieldGetName(field, monoClass);
      ret[name] = {
        address:  '0x' + parseInt(field).toString(16),
        offset:   '0x' + this.readByte(parseInt(field) + 12).toString(16),
        type:     this.getFieldType(field)
      }
    }
    return ret;
  },

  enumerateClass: function(name) {
    var klass = this.getClass(name);
    var ret = {
      address: klass,
      methods: this.getMethods(klass),
      fields: this.getFields(klass),

      getValue: function(instance, fieldName) {
        var field = this.fields[fieldName];
        var addr = parseInt(instance) + parseInt(field.offset, 16);
        return Enumerator.getFieldValue(addr, field.type);         // "this.getFieldValue" does not work
      },

      setValue: function(instance, fieldName, value) {
        var field = this.fields[fieldName];
        var addr = parseInt(instance) + parseInt(field.offset, 16);
        return Enumerator.setFieldValue(addr, field.type, value);  // "this.setFieldValue" does not work
      }
    }
    return ret;
  },

  // helpers
  prettyPrint: function(something) {
    console.log(JSON.stringify(something, null, 4));
  },
};

export default Enumerator

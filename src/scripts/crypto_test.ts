import {
  generateKemKeypair, generateDsaKeypair,
  wrapPhotoKey, unwrapPhotoKey,
  aesEncrypt, aesDecrypt,
  signRecord, verifyRecord,
} from '../services/crypto_service';

const kem = generateKemKeypair();
const dsa = generateDsaKeypair();

const { wrapped, aesKey } = wrapPhotoKey(kem.publicKey);
const plaintext = Buffer.from('hello vault');
const { ciphertext, iv, tag } = aesEncrypt(plaintext, aesKey);

const recoveredKey = unwrapPhotoKey(wrapped, kem.secretKey);
const decrypted = aesDecrypt(ciphertext, recoveredKey, iv, tag);
console.log('Decrypted matches:', decrypted.toString() === 'hello vault');

const record = 'test-record';
const sig = signRecord(dsa.secretKey, record);
console.log('Signature valid:', verifyRecord(dsa.publicKey, record, sig));
console.log('Tampered fails:', verifyRecord(dsa.publicKey, 'different', sig) === false);
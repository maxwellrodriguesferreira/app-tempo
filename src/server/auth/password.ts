import crypto from 'crypto';

/**
 * Hashing seguro de senhas com algoritmo scrypt padronizado pelo NIST/RFC 7914.
 * Inclui salt aleatório de 16 bytes e 64 bytes de chave derivada.
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Validação de senha com proteção estrita contra Timing Attacks (timingSafeEqual).
 */
export async function verifyPassword(password: string, combinedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    const parts = combinedHash.split(':');
    if (parts.length !== 2) return resolve(false);

    const [salt, originalHashHex] = parts;
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const originalBuffer = Buffer.from(originalHashHex, 'hex');
        if (originalBuffer.length !== derivedKey.length) {
          return resolve(false);
        }
        resolve(crypto.timingSafeEqual(originalBuffer, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

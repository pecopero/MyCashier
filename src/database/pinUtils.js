const { scryptSync, randomBytes, timingSafeEqual } = require('crypto')

const KEY_LEN = 64

function hashPin(pin) {
  const salt = randomBytes(16).toString('hex')
  const key  = scryptSync(String(pin), salt, KEY_LEN).toString('hex')
  return `scrypt:${salt}:${key}`
}

function verifyPin(inputPin, stored) {
  if (!stored) return false
  if (!stored.startsWith('scrypt:')) {
    // PIN lama plain text — bandingkan langsung
    return String(inputPin) === String(stored)
  }
  const [, salt, hash] = stored.split(':')
  try {
    const inputHash  = scryptSync(String(inputPin), salt, KEY_LEN)
    const storedHash = Buffer.from(hash, 'hex')
    if (inputHash.length !== storedHash.length) return false
    return timingSafeEqual(inputHash, storedHash)
  } catch {
    return false
  }
}

function isHashed(stored) {
  return typeof stored === 'string' && stored.startsWith('scrypt:')
}

module.exports = { hashPin, verifyPin, isHashed }

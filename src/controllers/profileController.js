import { Profile } from "../models/Profile.js";

const EMPTY_ADDRESS = { address: "", city: "", state: "", pin: "" };

function addressShape(address) {
  return {
    id: address?.id ?? "",
    address: address?.address ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    pin: address?.pin ?? "",
  };
}

function hasAddress(address) {
  return Boolean(address?.address || address?.city || address?.state || address?.pin);
}

function normalizeAddress(address) {
  return {
    ...(address?.id ? { id: String(address.id) } : {}),
    address: String(address?.address ?? "").trim(),
    city: String(address?.city ?? "").trim(),
    state: String(address?.state ?? "").trim(),
    pin: String(address?.pin ?? "").trim(),
  };
}

function shape(doc) {
  if (!doc) return { name: "", email: "", phone: "", address: EMPTY_ADDRESS, addresses: [] };
  const addresses = Array.isArray(doc.addresses) && doc.addresses.length
    ? doc.addresses.map(addressShape)
    : hasAddress(doc.address)
      ? [addressShape(doc.address)]
      : [];
  return {
    name: doc.name ?? "",
    email: doc.email ?? "",
    phone: doc.phone ?? "",
    address: addresses[0] ?? EMPTY_ADDRESS,
    addresses,
  };
}

export async function getProfile(req, res) {
  const doc = await Profile.findOne({ key: req.params.key }).lean();
  res.json(shape(doc));
}

export async function saveProfile(req, res) {
  const { name = "", email = "", phone = "", address, addresses } = req.body ?? {};
  const existing = await Profile.findOne({ key: req.params.key }).lean();
  const currentAddresses = shape(existing).addresses;
  const nextAddresses = Array.isArray(addresses)
    ? addresses.slice(0, 10).map(normalizeAddress)
    : hasAddress(address)
      ? [normalizeAddress(address), ...currentAddresses.filter((item) => item.address !== address.address || item.pin !== address.pin)]
      : currentAddresses;

  const doc = await Profile.findOneAndUpdate(
    { key: req.params.key },
    {
      key: req.params.key,
      name: String(name || existing?.name || "").trim(),
      email: String(email || existing?.email || "").trim().toLowerCase(),
      phone: String(phone || existing?.phone || "").trim(),
      addresses: nextAddresses,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  res.json(shape(doc));
}

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://bevvzphcxhkqvxtnplna.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_xbIpmQbPKSzHBwivHdWrjw_DvVbCVc7' // ← your real key


export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

function toHiddenEmail(username) {
  return `${username.toLowerCase().trim()}@dermascan.internal`
}

export async function signUp(username, password, profileData) {
  const { data: existing } = await supabase
    .from('patients')
    .select('id')
    .eq('username', username.toLowerCase().trim())
    .maybeSingle()

  if (existing) throw new Error('This username is already taken. Please choose another.')

  const { data, error } = await supabase.auth.signUp({
    email: toHiddenEmail(username),
    password: password
  })
  if (error) throw error

  const { error: profileError } = await supabase
    .from('patients')
    .insert([{
      id: data.user.id,
      username: username.toLowerCase().trim(),
      first_name: profileData.firstName,
      last_name: profileData.lastName,
      age: parseInt(profileData.age),
      gender: profileData.gender
    }])
  if (profileError) throw profileError

  return data.user
}

export async function signIn(username, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: toHiddenEmail(username),
    password: password
  })
  if (error) throw new Error('Invalid username or password.')
  return data.user
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getPatientProfile(userId) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function uploadScanImage(file, patientId, scanId) {
  const extension = file.name.split('.').pop()
  const filePath = `${patientId}/${scanId}.${extension}`
  const { error } = await supabase.storage
    .from('skin-scans')
    .upload(filePath, file)
  if (error) throw error
  const { data } = supabase.storage
    .from('skin-scans')
    .getPublicUrl(filePath)
  return data.publicUrl
}

export async function createScanRecord(patientId, imageUrl) {
  const { data, error } = await supabase
    .from('scans')
    .insert([{ patient_id: patientId, image_url: imageUrl }])
    .select()
  if (error) throw error
  return data[0]
}

export async function savePrediction(scanId, probability) {
  const { data, error } = await supabase
    .from('predictions')
    .insert([{ scan_id: scanId, probability: probability }])
    .select()
  if (error) throw error
  return data[0]
}

export async function getPatientScansWithPredictions(patientId) {
  const { data, error } = await supabase
    .from('scans')
    .select(`*, predictions (*)`)
    .eq('patient_id', patientId)
    .order('uploaded_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getScanById(scanId) {
  const { data, error } = await supabase
    .from('scans')
    .select(`*, predictions (*)`)
    .eq('id', scanId)
    .single()
  if (error) throw error
  return data
}
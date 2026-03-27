import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const loginUser = async (username, password) => {
  if (!supabase) return { error: { message: 'Supabase no configurado' }};
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error) return { error };
  if (!data) return { error: { message: 'Usuario no encontrado' }};
  
  if (data.event_password === password) {
    // Guarda la sesión en local
    localStorage.setItem('tapas_user', JSON.stringify(data));
    return { data };
  } else {
    return { error: { message: 'Contraseña del evento incorrecta' }};
  }
};

export const logoutUser = () => {
  localStorage.removeItem('tapas_user');
  window.location.reload();
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('tapas_user');
  return user ? JSON.parse(user) : null;
};

export const fetchTapas = async () => {
  if (!supabase) return { data: [] };
  const { data, error } = await supabase
    .from('tapas')
    .select('*')
    .order('id', { ascending: true });
    
  return { data, error };
};

export const fetchVotesForUser = async (username) => {
  if (!supabase) return { data: [] };
  const { data, error } = await supabase
    .from('votes')
    .select('tapa_id')
    .eq('voting_username', username);
    
  return { data, error };
}

export const submitVote = async (voteData) => {
  if (!supabase) return { error: { message: 'Supabase no configurado' }};
  const { data, error } = await supabase
    .from('votes')
    .insert([voteData]);
    
  return { data, error };
};

export const fetchRankingForUser = async (username) => {
  if (!supabase) return { data: null };
  const { data, error } = await supabase
    .from('user_rankings')
    .select('*')
    .eq('username', username)
    .single();
    
  return { data, error };
};

export const submitRanking = async (rankingData) => {
  if (!supabase) return { error: { message: 'Supabase no configurado' }};
  const { data, error } = await supabase
    .from('user_rankings')
    .upsert([rankingData]);
    
  return { data, error };
};

export const fetchAllVotes = async () => {
  if (!supabase) return { data: [] };
  const { data, error } = await supabase
    .from('votes')
    .select('*');
    
  return { data, error };
};

export const subscribeToVotes = (callback) => {
  if (!supabase) return null;
  return supabase
    .channel('public:votes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, callback)
    .subscribe();
};

export const fetchAllRankings = async () => {
  if (!supabase) return { data: [] };
  const { data, error } = await supabase
    .from('user_rankings')
    .select('*');
    
  return { data, error };
};

export const subscribeToRankings = (callback) => {
  if (!supabase) return null;
  return supabase
    .channel('public:user_rankings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_rankings' }, callback)
    .subscribe();
};

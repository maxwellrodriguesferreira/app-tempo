import { CitySearchResult } from '../../shared/types.js';
import { config } from '../config.js';
import { redis } from '../redis/client.js';

export interface CatalogCity {
  id: string;
  name: string;
  state?: string;
  country: string;
  country_code: string;
  latitude: number;
  longitude: number;
  timezone: string;
  aliases?: string[];
}

/**
 * Remove acentuações e converte para minúsculas para busca insensível a diacríticos
 */
export function normalizeText(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Catálogo integrado de capitais, grandes polos brasileiros e principais metrópoles mundiais.
 * Garante resposta instantânea (< 1ms) e resiliência offline.
 */
export const CATALOG_CITIES: CatalogCity[] = [
  // --- CAPITAIS DO BRASIL (26 Estados + DF) ---
  { id: 'br_sp_sao_paulo', name: 'São Paulo', state: 'SP', country: 'Brasil', country_code: 'BR', latitude: -23.5505, longitude: -46.6333, timezone: 'America/Sao_Paulo', aliases: ['sampa', 'sp'] },
  { id: 'br_rj_rio_de_janeiro', name: 'Rio de Janeiro', state: 'RJ', country: 'Brasil', country_code: 'BR', latitude: -22.9068, longitude: -43.1729, timezone: 'America/Sao_Paulo', aliases: ['rio', 'rj'] },
  { id: 'br_df_brasilia', name: 'Brasília', state: 'DF', country: 'Brasil', country_code: 'BR', latitude: -15.7975, longitude: -47.8919, timezone: 'America/Sao_Paulo', aliases: ['bsb', 'distrito federal'] },
  { id: 'br_ba_salvador', name: 'Salvador', state: 'BA', country: 'Brasil', country_code: 'BR', latitude: -12.9777, longitude: -38.5016, timezone: 'America/Bahia', aliases: ['ssa'] },
  { id: 'br_ce_fortaleza', name: 'Fortaleza', state: 'CE', country: 'Brasil', country_code: 'BR', latitude: -3.7319, longitude: -38.5267, timezone: 'America/Fortaleza', aliases: ['for'] },
  { id: 'br_mg_belo_horizonte', name: 'Belo Horizonte', state: 'MG', country: 'Brasil', country_code: 'BR', latitude: -19.9167, longitude: -43.9345, timezone: 'America/Sao_Paulo', aliases: ['bh', 'beaga'] },
  { id: 'br_am_manaus', name: 'Manaus', state: 'AM', country: 'Brasil', country_code: 'BR', latitude: -3.1190, longitude: -60.0217, timezone: 'America/Manaus', aliases: ['mao'] },
  { id: 'br_pr_curitiba', name: 'Curitiba', state: 'PR', country: 'Brasil', country_code: 'BR', latitude: -25.4284, longitude: -49.2733, timezone: 'America/Sao_Paulo', aliases: ['cwb'] },
  { id: 'br_pe_recife', name: 'Recife', state: 'PE', country: 'Brasil', country_code: 'BR', latitude: -8.0476, longitude: -34.8770, timezone: 'America/Recife', aliases: ['rec'] },
  { id: 'br_rs_porto_alegre', name: 'Porto Alegre', state: 'RS', country: 'Brasil', country_code: 'BR', latitude: -30.0346, longitude: -51.2177, timezone: 'America/Sao_Paulo', aliases: ['poa'] },
  { id: 'br_pa_belem', name: 'Belém', state: 'PA', country: 'Brasil', country_code: 'BR', latitude: -1.4558, longitude: -48.4902, timezone: 'America/Belem', aliases: ['bel'] },
  { id: 'br_go_goiania', name: 'Goiânia', state: 'GO', country: 'Brasil', country_code: 'BR', latitude: -16.6869, longitude: -49.2648, timezone: 'America/Sao_Paulo', aliases: ['gyn'] },
  { id: 'br_ma_sao_luis', name: 'São Luís', state: 'MA', country: 'Brasil', country_code: 'BR', latitude: -2.5307, longitude: -44.3068, timezone: 'America/Fortaleza', aliases: ['slz'] },
  { id: 'br_al_maceio', name: 'Maceió', state: 'AL', country: 'Brasil', country_code: 'BR', latitude: -9.6658, longitude: -35.7351, timezone: 'America/Maceio', aliases: ['mcx'] },
  { id: 'br_ms_campo_grande', name: 'Campo Grande', state: 'MS', country: 'Brasil', country_code: 'BR', latitude: -20.4697, longitude: -54.6201, timezone: 'America/Campo_Grande', aliases: ['cgr'] },
  { id: 'br_rn_natal', name: 'Natal', state: 'RN', country: 'Brasil', country_code: 'BR', latitude: -5.7945, longitude: -35.2110, timezone: 'America/Fortaleza', aliases: ['nat'] },
  { id: 'br_pi_teresina', name: 'Teresina', state: 'PI', country: 'Brasil', country_code: 'BR', latitude: -5.0920, longitude: -42.8038, timezone: 'America/Fortaleza', aliases: ['the'] },
  { id: 'br_pb_joao_pessoa', name: 'João Pessoa', state: 'PB', country: 'Brasil', country_code: 'BR', latitude: -7.1195, longitude: -34.8450, timezone: 'America/Fortaleza', aliases: ['jpa'] },
  { id: 'br_se_aracaju', name: 'Aracaju', state: 'SE', country: 'Brasil', country_code: 'BR', latitude: -10.9472, longitude: -37.0731, timezone: 'America/Maceio', aliases: ['aju'] },
  { id: 'br_mt_cuiaba', name: 'Cuiabá', state: 'MT', country: 'Brasil', country_code: 'BR', latitude: -15.6014, longitude: -56.0979, timezone: 'America/Cuiaba', aliases: ['cgb'] },
  { id: 'br_ro_porto_velho', name: 'Porto Velho', state: 'RO', country: 'Brasil', country_code: 'BR', latitude: -8.7619, longitude: -63.9039, timezone: 'America/Porto_Velho', aliases: ['pvh'] },
  { id: 'br_sc_florianopolis', name: 'Florianópolis', state: 'SC', country: 'Brasil', country_code: 'BR', latitude: -27.5954, longitude: -48.5480, timezone: 'America/Sao_Paulo', aliases: ['floripa', 'fln'] },
  { id: 'br_ap_macapa', name: 'Macapá', state: 'AP', country: 'Brasil', country_code: 'BR', latitude: 0.0356, longitude: -51.0705, timezone: 'America/Belem', aliases: ['mcp'] },
  { id: 'br_ac_rio_branco', name: 'Rio Branco', state: 'AC', country: 'Brasil', country_code: 'BR', latitude: -9.9753, longitude: -67.8249, timezone: 'America/Rio_Branco', aliases: ['rbr'] },
  { id: 'br_es_vitoria', name: 'Vitória', state: 'ES', country: 'Brasil', country_code: 'BR', latitude: -20.3155, longitude: -40.3128, timezone: 'America/Sao_Paulo', aliases: ['vix'] },
  { id: 'br_rr_boa_vista', name: 'Boa Vista', state: 'RR', country: 'Brasil', country_code: 'BR', latitude: 2.8235, longitude: -60.6758, timezone: 'America/Boa_Vista', aliases: ['bvb'] },
  { id: 'br_to_palmas', name: 'Palmas', state: 'TO', country: 'Brasil', country_code: 'BR', latitude: -10.2491, longitude: -48.3243, timezone: 'America/Araguaina', aliases: ['pmw'] },

  // --- GRANDES CENTROS E POLOS BRASILEIROS ---
  { id: 'br_sp_campinas', name: 'Campinas', state: 'SP', country: 'Brasil', country_code: 'BR', latitude: -22.9056, longitude: -47.0608, timezone: 'America/Sao_Paulo', aliases: ['cpq'] },
  { id: 'br_sp_santos', name: 'Santos', state: 'SP', country: 'Brasil', country_code: 'BR', latitude: -23.9608, longitude: -46.3336, timezone: 'America/Sao_Paulo', aliases: ['baixada santista'] },
  { id: 'br_sp_ribeirao_preto', name: 'Ribeirão Preto', state: 'SP', country: 'Brasil', country_code: 'BR', latitude: -21.1767, longitude: -47.8208, timezone: 'America/Sao_Paulo', aliases: ['raop'] },
  { id: 'br_sp_sjc', name: 'São José dos Campos', state: 'SP', country: 'Brasil', country_code: 'BR', latitude: -23.2237, longitude: -45.9009, timezone: 'America/Sao_Paulo', aliases: ['sjc', 'vale do paraiba'] },
  { id: 'br_sp_sorocaba', name: 'Sorocaba', state: 'SP', country: 'Brasil', country_code: 'BR', latitude: -23.5015, longitude: -47.4526, timezone: 'America/Sao_Paulo' },
  { id: 'br_rj_niteroi', name: 'Niterói', state: 'RJ', country: 'Brasil', country_code: 'BR', latitude: -22.8833, longitude: -43.1036, timezone: 'America/Sao_Paulo' },
  { id: 'br_mg_uberlandia', name: 'Uberlândia', state: 'MG', country: 'Brasil', country_code: 'BR', latitude: -18.9186, longitude: -48.2772, timezone: 'America/Sao_Paulo', aliases: ['triangulo mineiro', 'udi'] },
  { id: 'br_mg_juiz_de_fora', name: 'Juiz de Fora', state: 'MG', country: 'Brasil', country_code: 'BR', latitude: -21.7642, longitude: -43.3496, timezone: 'America/Sao_Paulo', aliases: ['jf'] },
  { id: 'br_pr_londrina', name: 'Londrina', state: 'PR', country: 'Brasil', country_code: 'BR', latitude: -23.3045, longitude: -51.1696, timezone: 'America/Sao_Paulo', aliases: ['ldb'] },
  { id: 'br_pr_maringa', name: 'Maringá', state: 'PR', country: 'Brasil', country_code: 'BR', latitude: -23.4205, longitude: -51.9333, timezone: 'America/Sao_Paulo', aliases: ['mga'] },
  { id: 'br_pr_foz', name: 'Foz do Iguaçu', state: 'PR', country: 'Brasil', country_code: 'BR', latitude: -25.5163, longitude: -54.5854, timezone: 'America/Sao_Paulo', aliases: ['cataratas', 'iguassu', 'iguazu'] },
  { id: 'br_sc_joinville', name: 'Joinville', state: 'SC', country: 'Brasil', country_code: 'BR', latitude: -26.3044, longitude: -48.8464, timezone: 'America/Sao_Paulo' },
  { id: 'br_sc_blumenau', name: 'Blumenau', state: 'SC', country: 'Brasil', country_code: 'BR', latitude: -26.9194, longitude: -49.0661, timezone: 'America/Sao_Paulo', aliases: ['oktoberfest'] },
  { id: 'br_sc_balneario', name: 'Balneário Camboriú', state: 'SC', country: 'Brasil', country_code: 'BR', latitude: -26.9926, longitude: -48.6353, timezone: 'America/Sao_Paulo', aliases: ['bc'] },
  { id: 'br_rs_caxias', name: 'Caxias do Sul', state: 'RS', country: 'Brasil', country_code: 'BR', latitude: -29.1678, longitude: -51.1794, timezone: 'America/Sao_Paulo', aliases: ['serra gaucha', 'cxs'] },
  { id: 'br_rs_gramado', name: 'Gramado', state: 'RS', country: 'Brasil', country_code: 'BR', latitude: -29.3746, longitude: -50.8764, timezone: 'America/Sao_Paulo' },
  { id: 'br_ba_feira', name: 'Feira de Santana', state: 'BA', country: 'Brasil', country_code: 'BR', latitude: -12.2664, longitude: -38.9663, timezone: 'America/Bahia' },
  { id: 'br_ba_porto_seguro', name: 'Porto Seguro', state: 'BA', country: 'Brasil', country_code: 'BR', latitude: -16.4497, longitude: -39.0647, timezone: 'America/Bahia', aliases: ['bps'] },
  { id: 'br_pe_caruaru', name: 'Caruaru', state: 'PE', country: 'Brasil', country_code: 'BR', latitude: -8.2833, longitude: -35.9761, timezone: 'America/Recife', aliases: ['sao joao'] },

  // --- AMÉRICA DO SUL & CENTRAL ---
  { id: 'ar_buenos_aires', name: 'Buenos Aires', state: 'CABA', country: 'Argentina', country_code: 'AR', latitude: -34.6037, longitude: -58.3816, timezone: 'America/Argentina/Buenos_Aires', aliases: ['bue', 'bsas'] },
  { id: 'ar_cordoba', name: 'Córdoba', state: 'Córdoba', country: 'Argentina', country_code: 'AR', latitude: -31.4201, longitude: -64.1888, timezone: 'America/Argentina/Cordoba' },
  { id: 'ar_bariloche', name: 'San Carlos de Bariloche', state: 'Río Negro', country: 'Argentina', country_code: 'AR', latitude: -41.1335, longitude: -71.3103, timezone: 'America/Argentina/Salta', aliases: ['bariloche'] },
  { id: 'uy_montevideo', name: 'Montevidéu', state: 'Montevideo', country: 'Uruguai', country_code: 'UY', latitude: -34.9011, longitude: -56.1645, timezone: 'America/Montevideo', aliases: ['montevideo', 'mvd'] },
  { id: 'uy_punta_del_este', name: 'Punta del Este', state: 'Maldonado', country: 'Uruguai', country_code: 'UY', latitude: -34.9644, longitude: -54.9439, timezone: 'America/Montevideo' },
  { id: 'cl_santiago', name: 'Santiago', state: 'Región Metropolitana', country: 'Chile', country_code: 'CL', latitude: -33.4489, longitude: -70.6693, timezone: 'America/Santiago', aliases: ['scl'] },
  { id: 'pe_lima', name: 'Lima', state: 'Lima', country: 'Peru', country_code: 'PE', latitude: -12.0464, longitude: -77.0428, timezone: 'America/Lima', aliases: ['lim'] },
  { id: 'pe_cusco', name: 'Cusco', state: 'Cusco', country: 'Peru', country_code: 'PE', latitude: -13.5319, longitude: -71.9675, timezone: 'America/Lima', aliases: ['cuzco', 'machu picchu'] },
  { id: 'co_bogota', name: 'Bogotá', state: 'Cundinamarca', country: 'Colômbia', country_code: 'CO', latitude: 4.7110, longitude: -74.0721, timezone: 'America/Bogota', aliases: ['bog'] },
  { id: 'co_medellin', name: 'Medellín', state: 'Antioquia', country: 'Colômbia', country_code: 'CO', latitude: 6.2442, longitude: -75.5812, timezone: 'America/Bogota', aliases: ['mde'] },
  { id: 'py_asuncion', name: 'Assunção', state: 'Distrito Capital', country: 'Paraguai', country_code: 'PY', latitude: -25.2637, longitude: -57.5759, timezone: 'America/Asuncion', aliases: ['asuncion', 'asu'] },
  { id: 'bo_la_paz', name: 'La Paz', state: 'La Paz', country: 'Bolívia', country_code: 'BO', latitude: -16.4897, longitude: -68.1193, timezone: 'America/La_Paz', aliases: ['lpz'] },
  { id: 'ec_quito', name: 'Quito', state: 'Pichincha', country: 'Equador', country_code: 'EC', latitude: -0.1807, longitude: -78.4678, timezone: 'America/Guayaquil', aliases: ['uio'] },
  { id: 'pa_panama', name: 'Cidade do Panamá', state: 'Panamá', country: 'Panamá', country_code: 'PA', latitude: 8.9824, longitude: -79.5199, timezone: 'America/Panama', aliases: ['pty', 'panama'] },

  // --- AMÉRICA DO NORTE ---
  { id: 'us_ny_new_york', name: 'Nova York', state: 'NY', country: 'Estados Unidos', country_code: 'US', latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York', aliases: ['new york', 'nyc', 'manhattan'] },
  { id: 'us_fl_miami', name: 'Miami', state: 'FL', country: 'Estados Unidos', country_code: 'US', latitude: 25.7617, longitude: -80.1918, timezone: 'America/New_York', aliases: ['mia', 'south beach'] },
  { id: 'us_fl_orlando', name: 'Orlando', state: 'FL', country: 'Estados Unidos', country_code: 'US', latitude: 28.5383, longitude: -81.3792, timezone: 'America/New_York', aliases: ['mco', 'disney'] },
  { id: 'us_ca_los_angeles', name: 'Los Angeles', state: 'CA', country: 'Estados Unidos', country_code: 'US', latitude: 34.0522, longitude: -118.2437, timezone: 'America/Los_Angeles', aliases: ['la', 'hollywood'] },
  { id: 'us_ca_san_francisco', name: 'São Francisco', state: 'CA', country: 'Estados Unidos', country_code: 'US', latitude: 37.7749, longitude: -122.4194, timezone: 'America/Los_Angeles', aliases: ['san francisco', 'sf', 'silicon valley'] },
  { id: 'us_il_chicago', name: 'Chicago', state: 'IL', country: 'Estados Unidos', country_code: 'US', latitude: 41.8781, longitude: -87.6298, timezone: 'America/Chicago', aliases: ['chi'] },
  { id: 'us_dc_washington', name: 'Washington D.C.', state: 'DC', country: 'Estados Unidos', country_code: 'US', latitude: 38.9072, longitude: -77.0369, timezone: 'America/New_York', aliases: ['washington', 'dc'] },
  { id: 'us_nv_las_vegas', name: 'Las Vegas', state: 'NV', country: 'Estados Unidos', country_code: 'US', latitude: 36.1699, longitude: -115.1398, timezone: 'America/Los_Angeles', aliases: ['vegas', 'las vegas'] },
  { id: 'ca_on_toronto', name: 'Toronto', state: 'ON', country: 'Canadá', country_code: 'CA', latitude: 43.6532, longitude: -79.3832, timezone: 'America/Toronto', aliases: ['yyz'] },
  { id: 'ca_bc_vancouver', name: 'Vancouver', state: 'BC', country: 'Canadá', country_code: 'CA', latitude: 49.2827, longitude: -123.1207, timezone: 'America/Vancouver', aliases: ['yvr'] },
  { id: 'mx_cdmx', name: 'Cidade do México', state: 'CDMX', country: 'México', country_code: 'MX', latitude: 19.4326, longitude: -99.1332, timezone: 'America/Mexico_City', aliases: ['mexico city', 'cdmx', 'mexico'] },
  { id: 'mx_cancun', name: 'Cancún', state: 'Quintana Roo', country: 'México', country_code: 'MX', latitude: 21.1619, longitude: -86.8515, timezone: 'America/Cancun', aliases: ['cancun', 'cun'] },

  // --- EUROPA ---
  { id: 'pt_lisboa', name: 'Lisboa', state: 'Lisboa', country: 'Portugal', country_code: 'PT', latitude: 38.7223, longitude: -9.1393, timezone: 'Europe/Lisbon', aliases: ['lisbon', 'lis'] },
  { id: 'pt_porto', name: 'Porto', state: 'Porto', country: 'Portugal', country_code: 'PT', latitude: 41.1579, longitude: -8.6291, timezone: 'Europe/Lisbon', aliases: ['opo'] },
  { id: 'es_madrid', name: 'Madrid', state: 'Comunidad de Madrid', country: 'Espanha', country_code: 'ES', latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid', aliases: ['mad'] },
  { id: 'es_barcelona', name: 'Barcelona', state: 'Cataluña', country: 'Espanha', country_code: 'ES', latitude: 41.3879, longitude: 2.1699, timezone: 'Europe/Madrid', aliases: ['bcn'] },
  { id: 'fr_paris', name: 'Paris', state: 'Île-de-France', country: 'França', country_code: 'FR', latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris', aliases: ['par', 'cdg'] },
  { id: 'gb_london', name: 'Londres', state: 'Inglaterra', country: 'Reino Unido', country_code: 'GB', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London', aliases: ['london', 'lon'] },
  { id: 'it_roma', name: 'Roma', state: 'Lazio', country: 'Itália', country_code: 'IT', latitude: 41.9028, longitude: 12.4964, timezone: 'Europe/Rome', aliases: ['rome', 'fco'] },
  { id: 'it_milano', name: 'Milão', state: 'Lombardia', country: 'Itália', country_code: 'IT', latitude: 45.4642, longitude: 9.1900, timezone: 'Europe/Rome', aliases: ['milan', 'milano', 'mxp'] },
  { id: 'de_berlin', name: 'Berlim', state: 'Berlin', country: 'Alemanha', country_code: 'DE', latitude: 52.5200, longitude: 13.4050, timezone: 'Europe/Berlin', aliases: ['berlin', 'ber'] },
  { id: 'de_munich', name: 'Munique', state: 'Baviera', country: 'Alemanha', country_code: 'DE', latitude: 48.1351, longitude: 11.5820, timezone: 'Europe/Berlin', aliases: ['munich', 'münchen', 'muc'] },
  { id: 'de_frankfurt', name: 'Frankfurt', state: 'Hessen', country: 'Alemanha', country_code: 'DE', latitude: 50.1109, longitude: 8.6821, timezone: 'Europe/Berlin', aliases: ['fra'] },
  { id: 'nl_amsterdam', name: 'Amsterdã', state: 'Holanda do Norte', country: 'Holanda', country_code: 'NL', latitude: 52.3676, longitude: 4.9041, timezone: 'Europe/Amsterdam', aliases: ['amsterdam', 'ams'] },
  { id: 'ch_zurich', name: 'Zurique', state: 'Zürich', country: 'Suíça', country_code: 'CH', latitude: 47.3769, longitude: 8.5417, timezone: 'Europe/Zurich', aliases: ['zurich', 'zrh'] },
  { id: 'at_vienna', name: 'Viena', state: 'Wien', country: 'Áustria', country_code: 'AT', latitude: 48.2082, longitude: 16.3738, timezone: 'Europe/Vienna', aliases: ['vienna', 'vie'] },
  { id: 'ie_dublin', name: 'Dublin', state: 'Leinster', country: 'Irlanda', country_code: 'IE', latitude: 53.3498, longitude: -6.2603, timezone: 'Europe/Dublin', aliases: ['dub'] },
  { id: 'gr_athens', name: 'Atenas', state: 'Ática', country: 'Grécia', country_code: 'GR', latitude: 37.9838, longitude: 23.7275, timezone: 'Europe/Athens', aliases: ['athens', 'ath'] },

  // --- ÁSIA, ORIENTE MÉDIO & OCEANIA ---
  { id: 'jp_tokyo', name: 'Tóquio', state: 'Kanto', country: 'Japão', country_code: 'JP', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo', aliases: ['tokyo', 'tyo'] },
  { id: 'jp_osaka', name: 'Osaka', state: 'Kansai', country: 'Japão', country_code: 'JP', latitude: 34.6937, longitude: 135.5023, timezone: 'Asia/Tokyo', aliases: ['osa'] },
  { id: 'cn_beijing', name: 'Pequim', state: 'Beijing', country: 'China', country_code: 'CN', latitude: 39.9042, longitude: 116.4074, timezone: 'Asia/Shanghai', aliases: ['beijing', 'pek'] },
  { id: 'cn_shanghai', name: 'Xangai', state: 'Shanghai', country: 'China', country_code: 'CN', latitude: 31.2304, longitude: 121.4737, timezone: 'Asia/Shanghai', aliases: ['shanghai', 'sha'] },
  { id: 'hk_hong_kong', name: 'Hong Kong', state: 'HK', country: 'Hong Kong', country_code: 'HK', latitude: 22.3193, longitude: 114.1694, timezone: 'Asia/Hong_Kong', aliases: ['hk'] },
  { id: 'kr_seoul', name: 'Seul', state: 'Gyeonggi', country: 'Coreia do Sul', country_code: 'KR', latitude: 37.5665, longitude: 126.9780, timezone: 'Asia/Seoul', aliases: ['seoul', 'sel'] },
  { id: 'sg_singapore', name: 'Singapura', state: 'Singapore', country: 'Singapura', country_code: 'SG', latitude: 1.3521, longitude: 103.8198, timezone: 'Asia/Singapore', aliases: ['singapore', 'sin'] },
  { id: 'ae_dubai', name: 'Dubai', state: 'Dubai', country: 'Emirados Árabes Unidos', country_code: 'AE', latitude: 25.2048, longitude: 55.2708, timezone: 'Asia/Dubai', aliases: ['dxb'] },
  { id: 'qa_doha', name: 'Doha', state: 'Ad-Dawhah', country: 'Catar', country_code: 'QA', latitude: 25.2854, longitude: 51.5310, timezone: 'Asia/Qatar', aliases: ['doh'] },
  { id: 'au_sydney', name: 'Sydney', state: 'NSW', country: 'Austrália', country_code: 'AU', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney', aliases: ['syd'] },
  { id: 'au_melbourne', name: 'Melbourne', state: 'VIC', country: 'Austrália', country_code: 'AU', latitude: -37.8136, longitude: 144.9631, timezone: 'Australia/Melbourne', aliases: ['mel'] },
  { id: 'za_cape_town', name: 'Cidade do Cabo', state: 'Western Cape', country: 'África do Sul', country_code: 'ZA', latitude: -33.9249, longitude: 18.4241, timezone: 'Africa/Johannesburg', aliases: ['cape town', 'cpt'] },
  { id: 'eg_cairo', name: 'Cairo', state: 'Cairo', country: 'Egito', country_code: 'EG', latitude: 30.0444, longitude: 31.2357, timezone: 'Africa/Cairo', aliases: ['cai'] },
];

/**
 * Mapeia códigos de país para nomes legíveis em português
 */
const countryDisplayNames = new Intl.DisplayNames(['pt-BR'], { type: 'region' });

export function getCountryNameInPt(code?: string): string {
  if (!code) return 'Brasil';
  try {
    return countryDisplayNames.of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

/**
 * Busca rápida no catálogo local (com normalização de acentos)
 */
export function searchInCatalog(query: string, limit = 8): CitySearchResult[] {
  const normQuery = normalizeText(query);
  if (normQuery.length < 2) return [];

  const matched: Array<{ city: CatalogCity; score: number }> = [];

  for (const city of CATALOG_CITIES) {
    const normName = normalizeText(city.name);
    const normState = normalizeText(city.state || '');
    const normCountry = normalizeText(city.country);
    const normAliases = (city.aliases || []).map(normalizeText);

    let score = 0;

    // Correspondência exata
    if (normName === normQuery) {
      score = 100;
    } else if (normName.startsWith(normQuery)) {
      score = 80;
    } else if (normAliases.some((a) => a === normQuery)) {
      score = 75;
    } else if (normAliases.some((a) => a.startsWith(normQuery))) {
      score = 65;
    } else if (normName.includes(normQuery)) {
      score = 50;
    } else if (normState.startsWith(normQuery) || normCountry.startsWith(normQuery)) {
      score = 30;
    }

    if (score > 0) {
      matched.push({ city, score });
    }
  }

  // Ordena por pontuação de relevância
  matched.sort((a, b) => b.score - a.score);

  return matched.slice(0, limit).map(({ city }) => ({
    id: city.id,
    name: city.name,
    state: city.state,
    country: city.country,
    country_code: city.country_code,
    latitude: city.latitude,
    longitude: city.longitude,
    timezone: city.timezone,
  }));
}

/**
 * Encontra a cidade no catálogo por nome ou alias
 */
export function findCityInCatalog(cityName: string): CatalogCity | undefined {
  const norm = normalizeText(cityName);
  return CATALOG_CITIES.find(
    (c) =>
      normalizeText(c.name) === norm ||
      (c.aliases && c.aliases.some((a) => normalizeText(a) === norm))
  );
}

/**
 * Busca geocodificada externa em APIs públicas ou integradas (OpenWeatherMap & Open-Meteo)
 */
export async function searchExternalGeocoding(query: string, limit = 8): Promise<CitySearchResult[]> {
  const results: CitySearchResult[] = [];

  // 1. OpenWeatherMap Geocoding API (se configurado)
  if (config.WEATHER_PROVIDER === 'openweathermap' && config.WEATHER_API_KEY) {
    try {
      const owmUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=${limit}&appid=${config.WEATHER_API_KEY}`;
      const owmRes = await fetch(owmUrl, { signal: AbortSignal.timeout(3000) });
      if (owmRes.ok) {
        const owmData = (await owmRes.json()) as Array<{
          name: string;
          local_names?: Record<string, string>;
          lat: number;
          lon: number;
          country: string;
          state?: string;
        }>;

        for (const item of owmData) {
          const ptName = item.local_names?.pt || item.name;
          results.push({
            id: `owm_${item.lat.toFixed(4)}_${item.lon.toFixed(4)}`,
            name: ptName,
            state: item.state,
            country: getCountryNameInPt(item.country),
            country_code: item.country,
            latitude: item.lat,
            longitude: item.lon,
          });
        }
      }
    } catch (err) {
      console.warn('[Geocoding OWM Aviso]:', err instanceof Error ? err.message : err);
    }
  }

  // 2. Open-Meteo Geocoding API (Alta cobertura global em português)
  try {
    const openMeteoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=${limit}&language=pt&format=json`;
    const omRes = await fetch(openMeteoUrl, { signal: AbortSignal.timeout(3000) });
    if (omRes.ok) {
      const omData = (await omRes.json()) as {
        results?: Array<{
          id: number;
          name: string;
          latitude: number;
          longitude: number;
          admin1?: string;
          country?: string;
          country_code?: string;
          timezone?: string;
        }>;
      };

      if (omData.results) {
        for (const r of omData.results) {
          results.push({
            id: `om_${r.id}`,
            name: r.name,
            state: r.admin1,
            country: r.country || getCountryNameInPt(r.country_code),
            country_code: r.country_code,
            latitude: r.latitude,
            longitude: r.longitude,
            timezone: r.timezone,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[Geocoding Open-Meteo Aviso]:', err instanceof Error ? err.message : err);
  }

  return results;
}

/**
 * Busca unificada abrangendo catálogo offline e serviços remotos com deduplicação e cache no Redis
 */
export async function searchCitiesUnified(query: string, limit = 8): Promise<CitySearchResult[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];

  const normKey = normalizeText(clean);
  const cacheKey = `search:cities:${normKey}`;

  // 1. Tenta recuperar do Redis remoto
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as CitySearchResult[];
    }
  } catch {
    // Continua sem interromper
  }

  // 2. Coleta resultados do catálogo local e das APIs externas
  const localMatches = searchInCatalog(clean, limit);
  let externalMatches: CitySearchResult[] = [];

  try {
    externalMatches = await searchExternalGeocoding(clean, limit);
  } catch (e) {
    console.warn('[Search Unified Error]:', e);
  }

  // 3. Mescla e remove duplicatas (coordenadas muito próximas < ~15km e nomes parecidos)
  const combined = [...localMatches, ...externalMatches];
  const uniqueList: CitySearchResult[] = [];

  for (const candidate of combined) {
    const isDuplicate = uniqueList.some((existing) => {
      const sameName = normalizeText(existing.name) === normalizeText(candidate.name);
      const distLat = Math.abs(existing.latitude - candidate.latitude);
      const distLon = Math.abs(existing.longitude - candidate.longitude);
      return (distLat < 0.15 && distLon < 0.15) || (sameName && distLat < 0.3 && distLon < 0.3);
    });

    if (!isDuplicate) {
      uniqueList.push(candidate);
    }

    if (uniqueList.length >= limit) break;
  }

  // 4. Salva no cache do Redis por 1 hora (3600 segundos)
  if (uniqueList.length > 0) {
    try {
      await redis.set(cacheKey, JSON.stringify(uniqueList), 3600);
    } catch {
      // Ignora falha de cache
    }
  }

  return uniqueList;
}

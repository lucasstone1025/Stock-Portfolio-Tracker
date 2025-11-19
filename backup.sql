--
-- PostgreSQL database dump
--

\restrict VhZpzDkfxcBC7jsKSf0uFATAKANzKlocTvpaJ4CvdDCEfygD330SbrLbdfn8vRa

-- Dumped from database version 15.15 (Debian 15.15-1.pgdg13+1)
-- Dumped by pg_dump version 15.15 (Debian 15.15-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alerts; Type: TABLE; Schema: public; Owner: lucasstone
--

CREATE TABLE public.alerts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    stock_id integer NOT NULL,
    target_price numeric(10,2) NOT NULL,
    direction character varying(4),
    triggered boolean DEFAULT false,
    createdat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT alerts_direction_check CHECK (((direction)::text = ANY (ARRAY[('up'::character varying)::text, ('down'::character varying)::text])))
);


ALTER TABLE public.alerts OWNER TO lucasstone;

--
-- Name: alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: lucasstone
--

CREATE SEQUENCE public.alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.alerts_id_seq OWNER TO lucasstone;

--
-- Name: alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lucasstone
--

ALTER SEQUENCE public.alerts_id_seq OWNED BY public.alerts.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: lucasstone
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO lucasstone;

--
-- Name: stocks; Type: TABLE; Schema: public; Owner: lucasstone
--

CREATE TABLE public.stocks (
    stockid integer NOT NULL,
    symbol character varying(10) NOT NULL,
    companyname character varying(100) NOT NULL,
    marketcap numeric(15,2),
    currentprice numeric(10,2),
    dayhigh numeric(10,2),
    daylow numeric(10,2),
    updatedat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sector character varying(50)
);


ALTER TABLE public.stocks OWNER TO lucasstone;

--
-- Name: stocks_stockid_seq; Type: SEQUENCE; Schema: public; Owner: lucasstone
--

CREATE SEQUENCE public.stocks_stockid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.stocks_stockid_seq OWNER TO lucasstone;

--
-- Name: stocks_stockid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lucasstone
--

ALTER SEQUENCE public.stocks_stockid_seq OWNED BY public.stocks.stockid;


--
-- Name: users; Type: TABLE; Schema: public; Owner: lucasstone
--

CREATE TABLE public.users (
    id integer NOT NULL,
    password_hash character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    first_name character varying(25)
);


ALTER TABLE public.users OWNER TO lucasstone;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: lucasstone
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO lucasstone;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lucasstone
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: watchlist; Type: TABLE; Schema: public; Owner: lucasstone
--

CREATE TABLE public.watchlist (
    id integer NOT NULL,
    user_id integer NOT NULL,
    stock_id integer NOT NULL,
    createdat timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.watchlist OWNER TO lucasstone;

--
-- Name: watchlist_id_seq; Type: SEQUENCE; Schema: public; Owner: lucasstone
--

CREATE SEQUENCE public.watchlist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.watchlist_id_seq OWNER TO lucasstone;

--
-- Name: watchlist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lucasstone
--

ALTER SEQUENCE public.watchlist_id_seq OWNED BY public.watchlist.id;


--
-- Name: alerts id; Type: DEFAULT; Schema: public; Owner: lucasstone
--

ALTER TABLE ONLY public.alerts ALTER COLUMN id SET DEFAULT nextval('public.alerts_id_seq'::regclass);


--
-- Name: stocks stockid; Type: DEFAULT; Schema: public; Owner: lucasstone
--

ALTER TABLE ONLY public.stocks ALTER COLUMN stockid SET DEFAULT nextval('public.stocks_stockid_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: lucasstone
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: watchlist id; Type: DEFAULT; Schema: public; Owner: lucasstone
--

ALTER TABLE ONLY public.watchlist ALTER COLUMN id SET DEFAULT nextval('public.watchlist_id_seq'::regclass);


--
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: lucasstone
--

COPY public.alerts (id, user_id, stock_id, target_price, direction, triggered, createdat) FROM stdin;
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: lucasstone
--

COPY public.session (sid, sess, expire) FROM stdin;
5lUQ8uiR2QvEldWJT3DeIaC01xnVs2fC	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:45:43.855Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:45:44
eMEcP6hPH7_DkBzkRLDHDXim7UGZy2G5	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:47:14.815Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:47:15
NT-sBYnPxUlggOUzGM_gkyxuSXD7xoo9	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:47:15.236Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:47:16
kbQ2wNrobZ1P_qKmVL-sDN4LatkQjNx8	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:06.101Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:07
Z4b6F9Uc3PgTMMnLJzrgTeK5LEO4noJF	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:09.890Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:10
I5E0uQIQMH7Q-bH-RpYdljk6KjZ_Pl4X	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:11.889Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:12
EQYIG560lMI-9yGFy6pH09RTM-JIRsEX	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:12.261Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:13
xLdBLc7IXsKKwwpMtlCkcVLmbv2tSGds	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:12.509Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":18}}	2025-11-19 16:53:13
NpTjI_F5tcXf8YRJWxHRR3aStEw-33Vr	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:12.523Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:13
4IeGv0x8Q_GFa5noPWWo2LMf1RAo663N	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:12.538Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:13
2F16VMoHuIil23ltj1lWMnpVXZ4tBy8Q	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:15.375Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:16
ajyOTCRpaEb6tafKNcVgh3KcIgmTMnCa	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:17.253Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":18}}	2025-11-19 16:53:18
P7tOGkJF8dyDkxcfQ4x94-stnDB86c1E	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:17.267Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:18
Xt2VnFrrfNSqb5T2eJWnAS2lvoRaIvUD	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:17.283Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:18
QswH7CEQBDEb8LC7wEuEbks7XOzT5Ug7	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:18.657Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:19
VuCuBJbMBT68AUTJZG5CpUN6N40Z0KLH	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:19.610Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:20
srbFapVBB1Je06S1xKu6Wb1MiVDXo5nu	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:21.457Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":18}}	2025-11-19 16:53:22
ITl8ljUYciUT8fR9C3RyXtwKrbajuZVB	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:21.471Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:22
Q0Q-eybGp7KBP5_kSeIyw9Z37rU3k_lI	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:21.487Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:22
gB9h2B6WM6drBYcgYXfq2-qLo5Wgqm7L	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:23.934Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:24
qiDxbR_S1eHx0DijTr0BApJenTdvlaZE	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:25.902Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":18}}	2025-11-19 16:53:26
1P0hHXyAyYdLZxR_dSad0xI5Ze9xnTSW	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:25.917Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:26
SnwGr273TTTVFhW1ZNXflHqGI-8AWVw1	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:25.932Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:26
50l3RLI0R2sAdNn0ocSQr4Qw_eSftQSX	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:28.990Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:29
nLuTL3iUGt7DrSTmCMyuauY7SeUhN7zK	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:31.047Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":18}}	2025-11-19 16:53:32
wKGY-mXV33uhFef3iE8pNrqc3JeAnGyf	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:31.060Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:32
FKArq33ZAZryT1T9IqG-KT5ODP-AXLh9	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:31.077Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:32
TN8K-HXbGjB4fWliWb1QQbeJkrad4BnG	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:34.234Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":17}}	2025-11-19 16:53:35
ytKwCEFp24PhuDJzqZ1EVIu8CpmDGz_z	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:34.247Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:35
XP_4EPkvUYXxFCxJDjWdbEFd2dSp_gnY	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:53:34.253Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:53:35
oX8hOAbQ-PrJu_M5JJo3nEz6AUeg9l2f	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:55:20.069Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:55:21
8StgKQU17Dvj2s29Y0KSDhjV_KBpZAu9	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:55:29.839Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:55:30
ofPx_CyJchSAHe5pqvfOSdqnNwUHkoxa	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:56:38.137Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:56:39
cvnViYfkGWNaVSYHJZAKc8RlNBT6tvb0	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:58:17.087Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:58:18
ImZyJbrU__l8JD7tWN8gJYIWwC_EtTt7	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:58:17.529Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:58:18
7LFaG4WP9YKzKT0FjudTG4UuCaRkT_6O	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:58:25.908Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:58:26
6bWuno8HmvINO5ki-5C9MZz_Hgjk3hJw	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:58:39.639Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:58:40
wEbDLnGTacU65qQB2pwLCpPtM_O3G91b	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T16:58:39.931Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 16:58:40
reo9wFCAK0A1kCWoQ-EHIq6Yw7_bgvUo	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:03:23.198Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:03:24
jMCbt85VoVfpwYu_-J0yEGILK64d0QGS	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:03:23.655Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:03:24
F05UgHYSk8besCd0omQFsmy2HjkGgyZ9	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:04:40.307Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:04:41
ukKzBxhQ56l0wHkpt0JXttCqlRWsG0o2	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:04:55.640Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:04:56
vz-Gb6ZUTjgyt_eA05YU93Hkq7Sb5ptA	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:05:59.721Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:06:00
FU5Qwvm6-673nY5xilqPSLlHyiVW6xGt	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:06:00.029Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:06:01
esdAmcFQGwuI4HU7_C8ST9IvRuH1XsH4	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:08:08.984Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:08:09
nrgBukHeW8WyrUGKSBwkkrXId1tXROp-	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:08:29.087Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:08:30
0YP0wK53YB18VwyeMvIwoe4BAnsbBgrr	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:08:29.534Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:08:30
XvkUBh-yVx2Z-l-wAbKRNBgcLYdvY42m	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:12:03.455Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:12:04
PXpOOBsm3BqAfLoHsoVwTgNaHeUFSVwk	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:12:03.684Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:12:04
aIyDCe0qKVIxQV8d3twwt3ZjlSYIAJvs	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:12:06.925Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":17}}	2025-11-19 17:12:07
tT8GEB43DupJrpDCKAba_Nl9mR2ByuP5	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:12:06.938Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:12:07
AiZa4SPfRW1e4bXz2vFCNloUOma-oaqy	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:12:06.947Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:12:07
ZqspuFTv4zDfe_hJM8zj9XPz8_w1XlnE	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:13:34.479Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:13:35
kfqfrTfAOMz8mvzHa1FY0a_fSuxtfUFW	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:13:34.951Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:13:35
V8YHrpZk7p8gqh-glN974qtgzK0g6FrV	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:15:44.036Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:15:45
tJe8BDeDM3hO5dXO_W2x-XK84RxzFEJD	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:17:19.318Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:17:20
X8asito8p_qdS_uyCeRmx8DZvoGIOMlO	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:18:10.845Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:18:11
6-5tJreIw6uToMMIZ9_RlHSiwfqbX4Hc	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:18:30.928Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:18:31
A20F-QhUxmeHi1joBsRibeYIzbJuM2D6	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:18:40.059Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:18:41
5NnQiaes69LtWBJTO3KDAtbQwjoWUB73	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:18:40.433Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:18:41
9faVbXHNqK_P7FkK2EJRwN-XY6y1EH39	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:19:10.362Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:19:11
51B1R4SiL7xGMPe9h5_R2ctkfsvH9yom	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:19:27.871Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:19:28
6EHxgOO-Kf9h4MPfjegZ4ZNam7ehYF6j	{"cookie":{"originalMaxAge":86399999,"expires":"2025-11-19T17:20:04.407Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:20:05
isE8Gs1cy_LVkX-0mVztNMXvNzbIXTsT	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:23:45.788Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:23:46
QtlwzWpFVRJzCtcb1xonJvNt8toTSO97	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:23:46.230Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:23:47
rJrDVg71C11XcHYofe9PeymXSyh1C0Ir	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:24:09.326Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:24:10
J40PSBQRluPKRan7oRnDXiV4a_tFT7Gl	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:28:42.947Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:28:43
25kFuWgI7s5G_bBqhOn4OePiKNmTOWDx	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:28:51.422Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:28:52
h4rTgAR6hAbFHUV5XuO6zqEzHNTTiRgH	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:28:51.838Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:28:52
r-bSR_7QyPgqmVYDn7fbGCMTN9SeucRS	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:33:57.032Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:33:58
BK4_Q7zwxB3mU5TmQXlqy0O_TlPwCf1m	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:33:57.503Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:33:58
0a_ymCReOTc66n6tEJR2eO2stXMe-Zpg	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:38:02.925Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:38:03
8XVKUxgc_DbsPm4tVyDISqdhbZZThEgI	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:39:02.222Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:39:03
4TmaBWkIzxkXGao4MGM1jvSwIFVgJ8hx	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:39:02.235Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:39:03
P5_hOhEKs-z9RxpNlC_6ndTTJX7gOErs	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:39:02.689Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:39:03
ca5Zwm10sfQqHzhkBVTWY1mhbtt3QHCb	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:40:56.252Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:40:57
nPKIphgTHFy4BXdC4_mUjjtuVSb9HMzM	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:41:00.968Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:41:01
ClSkpCxlaAdoBUIX6Zt0Ad5JcrGQu-p5	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:41:06.657Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:41:07
Ew6HGpIquvMN2UbN10xG97S0cliISPoH	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:44:07.996Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:44:08
etHKWX5M6USXWpnKYPZm4Ra5DfTXAdeE	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:44:08.384Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:44:09
m8Zq6GBFXwBPlq5r4nWJAj0wsgWFUwOk	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:49:12.413Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:49:13
6SNb1yFuK43Fm13aPZ97EljwfSRk87P9	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:49:12.850Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:49:13
XXaYgpiGkwCl8y75g_w1wiZc1oILVEeW	{"cookie":{"originalMaxAge":86400000,"expires":"2025-11-19T17:52:52.184Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"flash":{}}	2025-11-19 17:52:53
\.


--
-- Data for Name: stocks; Type: TABLE DATA; Schema: public; Owner: lucasstone
--

COPY public.stocks (stockid, symbol, companyname, marketcap, currentprice, dayhigh, daylow, updatedat, sector) FROM stdin;
88	AGMH	AGM Group Holdings Inc	0.79	0.06	0.08	0.05	2025-04-23 12:29:11.91659	Financial Services
90	SAFS	Safer Shot Inc	1.16	0.00	0.00	0.00	2025-04-23 12:30:04.160872	Aerospace & Defense
91	ASTS	AST SpaceMobile Inc	7405.91	22.82	23.93	22.64	2025-04-23 12:30:10.599446	Telecommunication
92	WGS	GeneDx Holdings Corp	3013.84	103.90	107.39	101.06	2025-04-23 12:30:17.967515	Health Care
93	RGTI	Rigetti Computing Inc	2588.17	8.97	9.35	8.87	2025-04-23 12:30:25.012808	Semiconductors
94	FNMA	Federal National Mortgage Association	7515.99	6.26	6.33	6.07	2025-04-23 12:30:32.241131	Financial Services
95	PG	Procter & Gamble Co	387451.60	163.56	168.45	163.11	2025-04-23 12:32:17.449762	Consumer products
89	AAPL	Apple Inc	3110019.91	204.37	208.00	202.80	2025-04-23 12:46:17.284294	Technology
63	NVDA	NVIDIA Corp	3608759.75	154.31	154.45	149.26	2025-06-25 19:19:24.089924	Semiconductors
64	TSLA	Tesla Inc	1095127.55	327.55	343.00	320.40	2025-06-25 19:19:25.952235	Automobiles
67	PEGA	Pegasystems Inc	7625.33	88.41	93.08	86.56	2025-04-23 12:14:53.651554	Technology
68	VRT	Vertiv Holdings Co	31604.38	79.19	86.93	78.10	2025-04-23 12:15:00.039253	Electrical Equipment
69	NVAX	Novavax Inc	1173.36	7.32	7.81	6.38	2025-04-23 12:15:06.614003	Biotechnology
70	ENPH	Enphase Energy Inc	6368.84	45.60	50.69	45.21	2025-04-23 12:15:14.599926	Semiconductors
71	TEM	Tempus AI Inc	8504.57	49.84	51.32	46.17	2025-04-23 12:15:20.898287	Life Sciences Tools & Services
66	PLTR	Palantir Technologies Inc	237045.19	100.45	103.76	97.83	2025-04-23 12:27:03.969666	Technology
72	BA	Boeing Co	129715.20	170.88	176.58	166.45	2025-04-23 12:27:17.732798	Aerospace & Defense
73	ENSC	Ensysce Biosciences Inc	3.08	3.48	4.85	2.34	2025-04-23 12:27:23.552022	Biotechnology
74	QBTS	D-Wave Quantum Inc	1982.63	6.96	7.40	6.68	2025-04-23 12:27:30.500245	Technology
75	SNOA	Sonoma Pharmaceuticals Inc	6.29	3.82	5.26	3.52	2025-04-23 12:27:35.864453	Pharmaceuticals
76	SMCI	Super Micro Computer Inc	20569.12	33.00	34.99	32.67	2025-04-23 12:27:40.59983	Technology
77	JYD	Jayud Global Logistics Ltd	15.73	0.24	0.32	0.12	2025-04-23 12:27:45.381361	Logistics & Transportation
78	INTC	Intel Corp	90330.52	20.48	21.03	20.31	2025-04-23 12:27:50.600249	Semiconductors
79	AREB	American Rebel Holdings Inc	5.02	3.30	3.74	2.08	2025-04-23 12:27:56.049727	Commercial Services & Supplies
81	SMMT	Summit Therapeutics Inc	22229.98	31.15	32.70	28.56	2025-04-23 12:28:08.534738	Biotechnology
82	FUBO	Fubotv Inc	1050.04	2.84	3.10	2.82	2025-04-23 12:28:14.316081	Media
83	WRD	WeRide Inc	2420.81	7.97	9.07	7.79	2025-04-23 12:28:19.599676	Auto Components
84	SLXN	Silexion Therapeutics Corp	8.66	1.00	1.29	0.76	2025-04-23 12:28:25.082703	Biotechnology
85	BNTX	Biontech SE	25120.14	113.55	120.32	108.18	2025-04-23 12:28:30.833551	Biotechnology
86	BMY	Bristol-Myers Squibb Co	99316.80	47.73	49.33	47.54	2025-04-23 12:28:35.316016	Pharmaceuticals
87	AGRI	AgriFORCE Growing Systems Ltd	3.58	2.05	2.40	1.78	2025-04-23 12:28:46.082449	Food Products
65	DFH	Dream Finders Homes Inc	2453.92	27.90	28.21	26.45	2025-07-09 19:03:24.378556	Consumer products
96	MU	Micron Technology Inc	182450.97	162.90	169.12	159.38	2025-09-19 14:58:47.983272	Semiconductors
80	AMZN	Amazon.com Inc	2485244.42	232.26	234.16	231.40	2025-09-19 14:59:55.263124	Retail
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: lucasstone
--

COPY public.users (id, password_hash, email, first_name) FROM stdin;
17	$2b$10$PIR/YH0QplIx7i1I3RrYtekfcU3cxKraXkiS3VMy6uZro7oixaYHy	lucasstone1223@aol.com	Lucas
18	google_lucasstone49@gmail.com	lucasstone49@gmail.com	lucas
\.


--
-- Data for Name: watchlist; Type: TABLE DATA; Schema: public; Owner: lucasstone
--

COPY public.watchlist (id, user_id, stock_id, createdat) FROM stdin;
135	17	64	2025-09-19 14:58:36.485522
136	17	65	2025-09-19 14:58:41.765818
137	17	96	2025-09-19 14:58:47.985658
138	17	95	2025-09-19 14:59:21.965222
139	17	80	2025-09-19 14:59:28.965364
140	18	63	2025-10-20 15:47:13.353249
\.


--
-- Name: alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lucasstone
--

SELECT pg_catalog.setval('public.alerts_id_seq', 38, true);


--
-- Name: stocks_stockid_seq; Type: SEQUENCE SET; Schema: public; Owner: lucasstone
--

SELECT pg_catalog.setval('public.stocks_stockid_seq', 96, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lucasstone
--

SELECT pg_catalog.setval('public.users_id_seq', 18, true);


--
-- Name: watchlist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lucasstone
--

SELECT pg_catalog.setval('public.watchlist_id_seq', 140, true);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: lucasstone
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: lucasstone
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: stocks stocks_pkey; Type: CONSTRAINT; Schema: public; Owner: lucasstone
--

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT stocks_pkey PRIMARY KEY (stockid);


--
-- Name: stocks unique_symbol; Type: CONSTRAINT; Schema: public; Owner: lucasstone
--

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT unique_symbol UNIQUE (symbol);


--
-- Name: watchlist unique_user_stock; Type: CONSTRAINT; Schema: public; Owner: lucasstone
--

ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT unique_user_stock UNIQUE (user_id, stock_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: lucasstone
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_password_hash_key; Type: CONSTRAINT; Schema: public; Owner: lucasstone
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_password_hash_key UNIQUE (password_hash);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: lucasstone
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: watchlist watchlist_pkey; Type: CONSTRAINT; Schema: public; Owner: lucasstone
--

ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: lucasstone
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: alerts alerts_stock_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lucasstone
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_stock_id_fkey FOREIGN KEY (stock_id) REFERENCES public.stocks(stockid) ON DELETE CASCADE;


--
-- Name: alerts alerts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lucasstone
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: watchlist watchlist_stock_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lucasstone
--

ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_stock_id_fkey FOREIGN KEY (stock_id) REFERENCES public.stocks(stockid) ON DELETE CASCADE;


--
-- Name: watchlist watchlist_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lucasstone
--

ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict VhZpzDkfxcBC7jsKSf0uFATAKANzKlocTvpaJ4CvdDCEfygD330SbrLbdfn8vRa


--
-- PostgreSQL database dump
--

\restrict UsqHCYQDadsftDOpZMyhYkzhfkTl9tq5K2VZ2hWVbOQNThHtlkqb7lTsZ212yst

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

-- Started on 2026-05-07 21:14:40

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 4 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- TOC entry 5532 (class 0 OID 0)
-- Dependencies: 4
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 276 (class 1259 OID 19693)
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id integer NOT NULL,
    user_id integer NOT NULL,
    company_id integer NOT NULL,
    login_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    logout_time timestamp without time zone,
    date date DEFAULT CURRENT_DATE NOT NULL
);


--
-- TOC entry 275 (class 1259 OID 19692)
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5533 (class 0 OID 0)
-- Dependencies: 275
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- TOC entry 270 (class 1259 OID 19587)
-- Name: barcodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.barcodes (
    id integer NOT NULL,
    order_id integer,
    purchase_order_id integer,
    company_id integer NOT NULL,
    item_name character varying(255) NOT NULL,
    hsn character varying(50),
    purchased_date date NOT NULL,
    mfg_date date,
    exp_date date,
    qr_number character varying(255),
    barcode_data text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    purchase_order_item_id integer
);


--
-- TOC entry 269 (class 1259 OID 19586)
-- Name: barcodes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.barcodes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5534 (class 0 OID 0)
-- Dependencies: 269
-- Name: barcodes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.barcodes_id_seq OWNED BY public.barcodes.id;


--
-- TOC entry 256 (class 1259 OID 19307)
-- Name: bid_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bid_items (
    id integer NOT NULL,
    bid_id integer NOT NULL,
    demand_item_id integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 255 (class 1259 OID 19306)
-- Name: bid_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bid_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5535 (class 0 OID 0)
-- Dependencies: 255
-- Name: bid_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bid_items_id_seq OWNED BY public.bid_items.id;


--
-- TOC entry 226 (class 1259 OID 18849)
-- Name: bill_of_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_of_materials (
    id integer NOT NULL,
    project_id integer NOT NULL,
    serial_number integer,
    material_name character varying(255) CONSTRAINT bill_of_materials_item_name_not_null NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit character varying(50) NOT NULL,
    hsn character varying(50),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    estimated_cost numeric(10,2),
    supplier character varying(255)
);


--
-- TOC entry 225 (class 1259 OID 18848)
-- Name: bill_of_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bill_of_materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5536 (class 0 OID 0)
-- Dependencies: 225
-- Name: bill_of_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bill_of_materials_id_seq OWNED BY public.bill_of_materials.id;


--
-- TOC entry 220 (class 1259 OID 18781)
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    gst_number character varying(15),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 219 (class 1259 OID 18780)
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5537 (class 0 OID 0)
-- Dependencies: 219
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- TOC entry 252 (class 1259 OID 19254)
-- Name: demand_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.demand_items (
    id integer NOT NULL,
    demand_id integer NOT NULL,
    serial_number integer NOT NULL,
    item_name character varying(255) NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit character varying(50) NOT NULL,
    hsn character varying(50),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 251 (class 1259 OID 19253)
-- Name: demand_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.demand_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5538 (class 0 OID 0)
-- Dependencies: 251
-- Name: demand_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.demand_items_id_seq OWNED BY public.demand_items.id;


--
-- TOC entry 236 (class 1259 OID 18977)
-- Name: enquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enquiries (
    id integer NOT NULL,
    enquiry_number character varying(20) NOT NULL,
    company_id integer,
    uploaded_by integer,
    pdf_filename character varying(255) NOT NULL,
    pdf_path character varying(500) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_to integer,
    quotation_filename text,
    quotation_path text,
    quotation_uploaded_at timestamp without time zone,
    po_filename text,
    po_path text,
    po_uploaded_at timestamp without time zone,
    customer_remarks text
);


--
-- TOC entry 235 (class 1259 OID 18976)
-- Name: enquiries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.enquiries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5539 (class 0 OID 0)
-- Dependencies: 235
-- Name: enquiries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.enquiries_id_seq OWNED BY public.enquiries.id;


--
-- TOC entry 230 (class 1259 OID 18896)
-- Name: inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory (
    id integer NOT NULL,
    company_id integer NOT NULL,
    item_name character varying(255) NOT NULL,
    quantity numeric(10,2) DEFAULT 0 NOT NULL,
    unit character varying(50) NOT NULL,
    hsn character varying(50),
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 229 (class 1259 OID 18895)
-- Name: inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5540 (class 0 OID 0)
-- Dependencies: 229
-- Name: inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_id_seq OWNED BY public.inventory.id;


--
-- TOC entry 260 (class 1259 OID 19395)
-- Name: major_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.major_orders (
    id integer NOT NULL,
    company_id integer NOT NULL,
    materials_detail_id integer,
    vendor_id integer NOT NULL,
    item_name character varying(255) NOT NULL,
    hsn character varying(50),
    quantity numeric(10,2) NOT NULL,
    unit character varying(50) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    order_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expected_delivery_date date,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 259 (class 1259 OID 19394)
-- Name: major_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.major_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5541 (class 0 OID 0)
-- Dependencies: 259
-- Name: major_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.major_orders_id_seq OWNED BY public.major_orders.id;


--
-- TOC entry 242 (class 1259 OID 19089)
-- Name: master_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_materials (
    id integer NOT NULL,
    business_name character varying(255) NOT NULL,
    material_name character varying(255) NOT NULL,
    hsn_code character varying(50),
    gst_rate numeric(10,2) DEFAULT 0,
    material_rate numeric(10,2) DEFAULT 0,
    unit character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    company_id integer
);


--
-- TOC entry 241 (class 1259 OID 19088)
-- Name: master_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.master_materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5542 (class 0 OID 0)
-- Dependencies: 241
-- Name: master_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.master_materials_id_seq OWNED BY public.master_materials.id;


--
-- TOC entry 244 (class 1259 OID 19107)
-- Name: master_vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_vendors (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    phone_number character varying(50),
    address text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    company_id integer
);


--
-- TOC entry 243 (class 1259 OID 19106)
-- Name: master_vendors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.master_vendors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5543 (class 0 OID 0)
-- Dependencies: 243
-- Name: master_vendors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.master_vendors_id_seq OWNED BY public.master_vendors.id;


--
-- TOC entry 258 (class 1259 OID 19338)
-- Name: materials_detail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materials_detail (
    id integer NOT NULL,
    company_id integer,
    demand_id integer,
    demand_item_id integer,
    bid_id integer,
    vendor_id integer,
    item_name character varying(255) NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit character varying(50) NOT NULL,
    hsn character varying(50),
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    supply_until_date date NOT NULL,
    vendor_name character varying(255),
    vendor_gstin character varying(15),
    status character varying(50) DEFAULT 'pending'::character varying,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT materials_detail_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'ordered'::character varying, 'received'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- TOC entry 257 (class 1259 OID 19337)
-- Name: materials_detail_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.materials_detail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5544 (class 0 OID 0)
-- Dependencies: 257
-- Name: materials_detail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.materials_detail_id_seq OWNED BY public.materials_detail.id;


--
-- TOC entry 264 (class 1259 OID 19467)
-- Name: minor_order_bids; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.minor_order_bids (
    id integer NOT NULL,
    minor_order_id integer NOT NULL,
    vendor_id integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT minor_order_bids_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying])::text[])))
);


--
-- TOC entry 263 (class 1259 OID 19466)
-- Name: minor_order_bids_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.minor_order_bids_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5545 (class 0 OID 0)
-- Dependencies: 263
-- Name: minor_order_bids_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.minor_order_bids_id_seq OWNED BY public.minor_order_bids.id;


--
-- TOC entry 262 (class 1259 OID 19435)
-- Name: minor_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.minor_orders (
    id integer NOT NULL,
    company_id integer NOT NULL,
    item_name character varying(255) NOT NULL,
    hsn character varying(50),
    quantity numeric(10,2) NOT NULL,
    unit character varying(50) NOT NULL,
    deadline_date date NOT NULL,
    status character varying(50) DEFAULT 'open'::character varying,
    selected_vendor_id integer,
    selected_bid_id integer,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT minor_orders_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'awarded'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- TOC entry 261 (class 1259 OID 19434)
-- Name: minor_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.minor_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5546 (class 0 OID 0)
-- Dependencies: 261
-- Name: minor_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.minor_orders_id_seq OWNED BY public.minor_orders.id;


--
-- TOC entry 228 (class 1259 OID 18873)
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(50) DEFAULT 'info'::character varying,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    project_id integer
);


--
-- TOC entry 227 (class 1259 OID 18872)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5547 (class 0 OID 0)
-- Dependencies: 227
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 268 (class 1259 OID 19540)
-- Name: order_receipt_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_receipt_items (
    id integer NOT NULL,
    receipt_id integer NOT NULL,
    order_id integer,
    item_name character varying(255) NOT NULL,
    hsn character varying(50),
    quantity_ordered numeric(10,2) NOT NULL,
    quantity_received numeric(10,2) NOT NULL,
    unit character varying(50) NOT NULL,
    unit_price numeric(10,2),
    gst_rate numeric(5,2),
    gst_amount numeric(10,2),
    total_amount numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    purchase_order_item_id integer
);


--
-- TOC entry 267 (class 1259 OID 19539)
-- Name: order_receipt_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_receipt_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5548 (class 0 OID 0)
-- Dependencies: 267
-- Name: order_receipt_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_receipt_items_id_seq OWNED BY public.order_receipt_items.id;


--
-- TOC entry 266 (class 1259 OID 19502)
-- Name: order_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_receipts (
    id integer NOT NULL,
    order_id integer,
    company_id integer NOT NULL,
    bill_image_url text NOT NULL,
    receipt_date date DEFAULT CURRENT_DATE,
    total_amount numeric(10,2),
    total_gst_amount numeric(10,2),
    status character varying(50) DEFAULT 'pending'::character varying,
    submitted_by integer,
    approved_by integer,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    purchase_order_id integer,
    gross_weight numeric(10,2),
    tare_weight numeric(10,2),
    net_weight numeric(10,2),
    vehicle_weight_unit character varying(20) DEFAULT 'kg'::character varying,
    receipt_status character varying(20) DEFAULT 'complete'::character varying,
    total_quantity_received numeric(10,2) DEFAULT 0,
    CONSTRAINT order_receipts_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


--
-- TOC entry 265 (class 1259 OID 19501)
-- Name: order_receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5549 (class 0 OID 0)
-- Dependencies: 265
-- Name: order_receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_receipts_id_seq OWNED BY public.order_receipts.id;


--
-- TOC entry 232 (class 1259 OID 18918)
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    company_id integer NOT NULL,
    order_type character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_by integer NOT NULL,
    total_amount numeric(10,2),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT orders_order_type_check CHECK (((order_type)::text = ANY ((ARRAY['major'::character varying, 'minor'::character varying])::text[]))),
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'in_transit'::character varying, 'delivered'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- TOC entry 231 (class 1259 OID 18917)
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5550 (class 0 OID 0)
-- Dependencies: 231
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- TOC entry 234 (class 1259 OID 18955)
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 233 (class 1259 OID 18954)
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5551 (class 0 OID 0)
-- Dependencies: 233
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- TOC entry 224 (class 1259 OID 18820)
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    company_id integer NOT NULL,
    created_by integer NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    sketch_url text,
    hsn_code character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    po_number character varying(100),
    assigned_to integer,
    priority character varying(50) DEFAULT 'medium'::character varying,
    start_date date,
    end_date date,
    npd_user_id integer,
    project_id integer,
    po_filename text,
    po_path text,
    CONSTRAINT projects_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- TOC entry 223 (class 1259 OID 18819)
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5552 (class 0 OID 0)
-- Dependencies: 223
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- TOC entry 248 (class 1259 OID 19154)
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    id integer NOT NULL,
    po_id integer NOT NULL,
    material_name character varying(255) NOT NULL,
    hsn character varying(50),
    quantity numeric(15,2) NOT NULL,
    unit character varying(50) NOT NULL,
    unit_price numeric(15,2),
    total_price numeric(15,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    gst_rate numeric(10,2) DEFAULT 0
);


--
-- TOC entry 247 (class 1259 OID 19153)
-- Name: purchase_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5553 (class 0 OID 0)
-- Dependencies: 247
-- Name: purchase_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_order_items_id_seq OWNED BY public.purchase_order_items.id;


--
-- TOC entry 246 (class 1259 OID 19121)
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id integer NOT NULL,
    company_id integer NOT NULL,
    master_vendor_id integer NOT NULL,
    vendor_name character varying(255) NOT NULL,
    vendor_email character varying(255),
    total_amount numeric(15,2) DEFAULT 0,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    po_number_sequential integer
);


--
-- TOC entry 245 (class 1259 OID 19120)
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5554 (class 0 OID 0)
-- Dependencies: 245
-- Name: purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_orders_id_seq OWNED BY public.purchase_orders.id;


--
-- TOC entry 274 (class 1259 OID 19672)
-- Name: requirement_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirement_items (
    id integer NOT NULL,
    requirement_id integer NOT NULL,
    serial_number integer NOT NULL,
    item_name character varying(255) NOT NULL,
    quantity character varying(100),
    hsn character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 273 (class 1259 OID 19671)
-- Name: requirement_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.requirement_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5555 (class 0 OID 0)
-- Dependencies: 273
-- Name: requirement_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.requirement_items_id_seq OWNED BY public.requirement_items.id;


--
-- TOC entry 272 (class 1259 OID 19642)
-- Name: requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirements (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    priority character varying(50) DEFAULT 'medium'::character varying,
    created_by integer NOT NULL,
    sent_to integer NOT NULL,
    project_id integer,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 271 (class 1259 OID 19641)
-- Name: requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5556 (class 0 OID 0)
-- Dependencies: 271
-- Name: requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.requirements_id_seq OWNED BY public.requirements.id;


--
-- TOC entry 240 (class 1259 OID 19062)
-- Name: revision_bom_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revision_bom_items (
    id integer NOT NULL,
    revision_id integer NOT NULL,
    serial_number integer NOT NULL,
    material_name character varying(255) NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit character varying(50) NOT NULL,
    estimated_cost numeric(10,2),
    supplier character varying(255),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 239 (class 1259 OID 19061)
-- Name: revision_bom_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.revision_bom_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5557 (class 0 OID 0)
-- Dependencies: 239
-- Name: revision_bom_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.revision_bom_items_id_seq OWNED BY public.revision_bom_items.id;


--
-- TOC entry 238 (class 1259 OID 19036)
-- Name: revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revisions (
    id integer NOT NULL,
    project_id integer NOT NULL,
    revision_number integer NOT NULL,
    sketch_url text,
    notes text,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 237 (class 1259 OID 19035)
-- Name: revisions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.revisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5558 (class 0 OID 0)
-- Dependencies: 237
-- Name: revisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.revisions_id_seq OWNED BY public.revisions.id;


--
-- TOC entry 222 (class 1259 OID 18794)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    company_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_approved boolean DEFAULT true,
    approved_by integer,
    approved_at timestamp without time zone,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['management'::character varying, 'accountant'::character varying, 'store_incharge'::character varying, 'npd'::character varying])::text[])))
);


--
-- TOC entry 221 (class 1259 OID 18793)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5559 (class 0 OID 0)
-- Dependencies: 221
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 254 (class 1259 OID 19277)
-- Name: vendor_bids; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_bids (
    id integer NOT NULL,
    demand_id integer NOT NULL,
    vendor_id integer NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    supply_until_date date NOT NULL,
    notes text,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vendor_bids_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying])::text[])))
);


--
-- TOC entry 253 (class 1259 OID 19276)
-- Name: vendor_bids_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_bids_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5560 (class 0 OID 0)
-- Dependencies: 253
-- Name: vendor_bids_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_bids_id_seq OWNED BY public.vendor_bids.id;


--
-- TOC entry 250 (class 1259 OID 19228)
-- Name: vendor_demands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_demands (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    company_id integer,
    created_by integer NOT NULL,
    status character varying(50) DEFAULT 'open'::character varying,
    bid_deadline timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vendor_demands_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'closed'::character varying, 'awarded'::character varying])::text[])))
);


--
-- TOC entry 249 (class 1259 OID 19227)
-- Name: vendor_demands_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_demands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5561 (class 0 OID 0)
-- Dependencies: 249
-- Name: vendor_demands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_demands_id_seq OWNED BY public.vendor_demands.id;


--
-- TOC entry 5098 (class 2604 OID 19696)
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- TOC entry 5089 (class 2604 OID 19590)
-- Name: barcodes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcodes ALTER COLUMN id SET DEFAULT nextval('public.barcodes_id_seq'::regclass);


--
-- TOC entry 5060 (class 2604 OID 19310)
-- Name: bid_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bid_items ALTER COLUMN id SET DEFAULT nextval('public.bid_items_id_seq'::regclass);


--
-- TOC entry 5008 (class 2604 OID 18852)
-- Name: bill_of_materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_materials ALTER COLUMN id SET DEFAULT nextval('public.bill_of_materials_id_seq'::regclass);


--
-- TOC entry 4996 (class 2604 OID 18784)
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- TOC entry 5054 (class 2604 OID 19257)
-- Name: demand_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_items ALTER COLUMN id SET DEFAULT nextval('public.demand_items_id_seq'::regclass);


--
-- TOC entry 5026 (class 2604 OID 18980)
-- Name: enquiries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries ALTER COLUMN id SET DEFAULT nextval('public.enquiries_id_seq'::regclass);


--
-- TOC entry 5014 (class 2604 OID 18899)
-- Name: inventory id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory ALTER COLUMN id SET DEFAULT nextval('public.inventory_id_seq'::regclass);


--
-- TOC entry 5066 (class 2604 OID 19398)
-- Name: major_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.major_orders ALTER COLUMN id SET DEFAULT nextval('public.major_orders_id_seq'::regclass);


--
-- TOC entry 5034 (class 2604 OID 19092)
-- Name: master_materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_materials ALTER COLUMN id SET DEFAULT nextval('public.master_materials_id_seq'::regclass);


--
-- TOC entry 5039 (class 2604 OID 19110)
-- Name: master_vendors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_vendors ALTER COLUMN id SET DEFAULT nextval('public.master_vendors_id_seq'::regclass);


--
-- TOC entry 5062 (class 2604 OID 19341)
-- Name: materials_detail id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials_detail ALTER COLUMN id SET DEFAULT nextval('public.materials_detail_id_seq'::regclass);


--
-- TOC entry 5075 (class 2604 OID 19470)
-- Name: minor_order_bids id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_order_bids ALTER COLUMN id SET DEFAULT nextval('public.minor_order_bids_id_seq'::regclass);


--
-- TOC entry 5071 (class 2604 OID 19438)
-- Name: minor_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_orders ALTER COLUMN id SET DEFAULT nextval('public.minor_orders_id_seq'::regclass);


--
-- TOC entry 5010 (class 2604 OID 18876)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 5087 (class 2604 OID 19543)
-- Name: order_receipt_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipt_items ALTER COLUMN id SET DEFAULT nextval('public.order_receipt_items_id_seq'::regclass);


--
-- TOC entry 5079 (class 2604 OID 19505)
-- Name: order_receipts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipts ALTER COLUMN id SET DEFAULT nextval('public.order_receipts_id_seq'::regclass);


--
-- TOC entry 5019 (class 2604 OID 18921)
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- TOC entry 5023 (class 2604 OID 18958)
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- TOC entry 5003 (class 2604 OID 18823)
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- TOC entry 5047 (class 2604 OID 19157)
-- Name: purchase_order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items ALTER COLUMN id SET DEFAULT nextval('public.purchase_order_items_id_seq'::regclass);


--
-- TOC entry 5042 (class 2604 OID 19124)
-- Name: purchase_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.purchase_orders_id_seq'::regclass);


--
-- TOC entry 5096 (class 2604 OID 19675)
-- Name: requirement_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_items ALTER COLUMN id SET DEFAULT nextval('public.requirement_items_id_seq'::regclass);


--
-- TOC entry 5091 (class 2604 OID 19645)
-- Name: requirements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements ALTER COLUMN id SET DEFAULT nextval('public.requirements_id_seq'::regclass);


--
-- TOC entry 5032 (class 2604 OID 19065)
-- Name: revision_bom_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revision_bom_items ALTER COLUMN id SET DEFAULT nextval('public.revision_bom_items_id_seq'::regclass);


--
-- TOC entry 5030 (class 2604 OID 19039)
-- Name: revisions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revisions ALTER COLUMN id SET DEFAULT nextval('public.revisions_id_seq'::regclass);


--
-- TOC entry 4999 (class 2604 OID 18797)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5056 (class 2604 OID 19280)
-- Name: vendor_bids id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_bids ALTER COLUMN id SET DEFAULT nextval('public.vendor_bids_id_seq'::regclass);


--
-- TOC entry 5050 (class 2604 OID 19231)
-- Name: vendor_demands id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_demands ALTER COLUMN id SET DEFAULT nextval('public.vendor_demands_id_seq'::regclass);


--
-- TOC entry 5526 (class 0 OID 19693)
-- Dependencies: 276
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendance (id, user_id, company_id, login_time, logout_time, date) FROM stdin;
1	1	1	2026-03-16 13:40:29.556172	\N	2026-03-16
3	4	1	2026-03-16 13:42:42.338312	\N	2026-03-16
4	1	1	2026-03-16 14:44:12.668796	2026-03-16 14:44:36.26997	2026-03-16
2	1	1	2026-03-16 13:42:03.810816	2026-03-16 14:44:43.043566	2026-03-16
5	1	1	2026-03-16 14:45:22.704346	\N	2026-03-16
6	1	1	2026-03-16 14:46:26.986908	2026-03-16 14:48:06.60854	2026-03-16
7	2	1	2026-03-16 14:48:16.155915	2026-03-16 14:49:50.109881	2026-03-16
8	1	1	2026-03-16 14:50:02.006108	2026-03-16 14:50:43.331018	2026-03-16
9	2	1	2026-03-16 14:50:56.319362	\N	2026-03-16
10	2	1	2026-03-16 15:02:16.007974	2026-03-16 15:08:57.932181	2026-03-16
11	4	1	2026-03-16 15:09:08.006813	2026-03-16 15:09:20.773259	2026-03-16
12	2	1	2026-03-16 15:10:21.722592	\N	2026-03-16
13	2	1	2026-03-16 15:18:59.142411	\N	2026-03-16
14	2	1	2026-03-16 15:19:42.221703	\N	2026-03-16
15	2	1	2026-03-16 15:21:11.507815	2026-03-16 15:25:44.751267	2026-03-16
16	3	1	2026-03-16 15:26:18.3447	2026-03-16 15:46:13.671568	2026-03-16
17	4	1	2026-03-16 15:46:23.049277	\N	2026-03-16
19	3	1	2026-03-16 15:49:09.987373	\N	2026-03-16
18	4	1	2026-03-16 15:48:54.107017	2026-03-16 16:02:12.382349	2026-03-16
20	2	1	2026-03-16 16:02:24.308204	\N	2026-03-16
21	1	1	2026-04-09 21:20:03.538785	2026-04-09 21:24:50.986116	2026-04-09
23	2	1	2026-04-09 21:26:13.763807	\N	2026-04-09
25	4	1	2026-04-09 21:27:35.102289	\N	2026-04-09
26	2	1	2026-04-09 21:32:42.876884	\N	2026-04-09
24	1	1	2026-04-09 21:27:28.651892	2026-04-09 21:49:54.230582	2026-04-09
27	5	2	2026-04-09 22:03:27.428791	\N	2026-04-09
28	5	2	2026-04-09 22:10:18.090604	\N	2026-04-09
29	5	2	2026-04-09 22:11:05.632435	\N	2026-04-09
30	5	2	2026-04-09 22:14:00.166123	2026-04-09 22:14:37.157219	2026-04-09
31	5	2	2026-04-09 22:15:19.633249	2026-04-09 22:19:22.115848	2026-04-09
32	5	2	2026-04-09 22:21:17.148145	\N	2026-04-09
33	6	2	2026-04-09 22:23:57.291256	\N	2026-04-09
34	6	2	2026-04-09 22:24:47.520384	\N	2026-04-09
35	6	2	2026-04-09 22:29:43.60952	\N	2026-04-09
36	6	2	2026-04-09 22:31:04.911929	\N	2026-04-09
37	6	2	2026-04-09 22:33:04.191255	\N	2026-04-09
38	6	2	2026-04-09 22:33:51.925006	\N	2026-04-09
22	3	1	2026-04-09 21:25:08.046155	2026-04-09 22:36:37.527117	2026-04-09
39	7	2	2026-04-09 22:37:11.674934	\N	2026-04-09
40	7	2	2026-04-09 23:18:06.57277	\N	2026-04-09
41	7	2	2026-04-09 23:30:55.641402	\N	2026-04-09
42	7	2	2026-04-09 23:32:14.648721	\N	2026-04-09
43	7	2	2026-04-10 00:03:21.44568	\N	2026-04-10
44	7	2	2026-04-10 00:45:12.003762	\N	2026-04-10
45	7	2	2026-04-10 00:56:59.198799	\N	2026-04-10
46	7	2	2026-04-10 00:58:06.161205	2026-04-10 01:11:56.856542	2026-04-10
47	8	2	2026-04-10 01:12:07.406767	\N	2026-04-10
48	8	2	2026-04-10 01:25:02.472891	\N	2026-04-10
49	8	2	2026-04-10 01:40:33.731528	\N	2026-04-10
50	8	2	2026-04-10 01:46:37.18689	\N	2026-04-10
51	8	2	2026-04-10 02:09:10.406553	\N	2026-04-10
53	5	2	2026-04-10 02:23:08.111101	\N	2026-04-10
54	6	2	2026-04-10 02:23:15.066819	\N	2026-04-10
55	5	2	2026-04-10 02:25:59.063097	\N	2026-04-10
56	6	2	2026-04-10 02:34:47.661102	\N	2026-04-10
57	6	2	2026-04-10 02:42:58.433353	2026-04-10 02:43:29.568077	2026-04-10
52	7	2	2026-04-10 02:23:06.980775	2026-04-10 02:45:06.262319	2026-04-10
58	5	2	2026-04-10 12:27:19.601147	\N	2026-04-10
59	7	2	2026-04-10 12:27:20.539924	\N	2026-04-10
60	6	2	2026-04-10 12:27:21.961013	\N	2026-04-10
61	8	2	2026-04-10 12:27:37.595893	\N	2026-04-10
62	9	3	2026-04-29 18:41:59.781553	2026-04-29 18:42:06.240762	2026-04-29
63	9	3	2026-04-29 18:45:48.268846	2026-04-29 18:46:10.149987	2026-04-29
64	9	3	2026-04-29 18:48:05.713959	\N	2026-04-29
65	9	3	2026-04-29 18:49:17.201637	2026-04-29 18:50:01.257719	2026-04-29
66	9	3	2026-04-29 18:54:57.91623	2026-04-29 18:55:56.664053	2026-04-29
67	12	3	2026-04-29 18:56:33.058113	2026-04-29 18:56:54.147729	2026-04-29
68	10	3	2026-04-29 18:57:15.071668	2026-04-29 18:57:38.787079	2026-04-29
69	11	3	2026-04-29 18:58:02.580234	2026-04-29 18:58:16.994049	2026-04-29
70	12	3	2026-04-29 18:59:16.951916	2026-04-29 18:59:36.906933	2026-04-29
71	10	3	2026-04-29 19:00:49.16782	2026-04-29 19:02:50.943068	2026-04-29
72	9	3	2026-04-29 19:03:07.32466	\N	2026-04-29
73	9	3	2026-04-29 19:05:29.268883	2026-04-29 19:05:41.631414	2026-04-29
74	12	3	2026-04-29 19:06:14.172472	2026-04-29 19:09:53.216592	2026-04-29
75	9	3	2026-04-29 19:10:06.507106	\N	2026-04-29
76	9	3	2026-04-29 19:10:34.266667	2026-04-29 19:12:38.871272	2026-04-29
77	12	3	2026-04-29 19:13:10.390543	2026-04-29 19:15:53.603027	2026-04-29
78	9	3	2026-04-29 19:16:05.625364	2026-04-29 19:16:29.673272	2026-04-29
79	12	3	2026-04-29 19:16:54.950867	2026-04-29 19:21:52.322974	2026-04-29
80	9	3	2026-04-29 19:22:16.39412	2026-04-29 19:22:32.781539	2026-04-29
81	9	3	2026-04-29 19:25:34.998989	\N	2026-04-29
82	9	3	2026-04-29 19:30:05.922056	2026-04-29 19:30:26.363171	2026-04-29
83	12	3	2026-04-29 19:30:49.735365	2026-04-29 19:31:15.419011	2026-04-29
84	9	3	2026-04-29 19:31:30.462995	\N	2026-04-29
85	9	3	2026-04-29 19:32:14.227115	\N	2026-04-29
86	12	3	2026-04-29 19:43:41.082107	2026-04-29 19:45:51.806864	2026-04-29
87	9	3	2026-04-29 19:46:04.179848	2026-04-29 19:47:35.221276	2026-04-29
88	12	3	2026-04-29 19:47:53.342078	2026-04-29 19:49:04.961132	2026-04-29
89	9	3	2026-04-29 19:49:44.359467	2026-04-29 19:50:48.508657	2026-04-29
90	11	3	2026-04-29 19:51:42.932675	2026-04-29 19:52:10.849338	2026-04-29
91	9	3	2026-04-29 19:52:29.402181	2026-04-29 20:00:57.861026	2026-04-29
92	12	3	2026-04-29 20:01:20.361326	2026-04-29 20:06:12.691236	2026-04-29
93	9	3	2026-04-30 18:44:09.907823	2026-04-30 18:45:04.510227	2026-04-30
94	12	3	2026-04-30 18:45:25.401695	2026-04-30 18:46:17.827448	2026-04-30
95	10	3	2026-04-30 18:46:48.148844	2026-04-30 18:47:53.519823	2026-04-30
96	12	3	2026-04-30 18:48:33.172378	2026-04-30 18:49:12.534667	2026-04-30
97	10	3	2026-04-30 18:49:34.659023	2026-04-30 18:53:31.06836	2026-04-30
98	11	3	2026-04-30 18:53:56.098277	2026-04-30 18:54:27.120117	2026-04-30
99	10	3	2026-04-30 18:54:55.367648	2026-04-30 18:56:13.773556	2026-04-30
100	9	3	2026-04-30 18:56:37.502394	2026-04-30 18:59:16.80543	2026-04-30
101	12	3	2026-04-30 18:59:35.776844	2026-04-30 19:02:50.863232	2026-04-30
102	9	3	2026-04-30 19:03:13.628898	2026-04-30 19:04:48.434586	2026-04-30
103	12	3	2026-04-30 19:06:22.224877	2026-04-30 19:08:55.727912	2026-04-30
104	11	3	2026-04-30 19:09:20.803577	2026-04-30 19:10:54.64461	2026-04-30
105	10	3	2026-04-30 19:11:12.922023	2026-04-30 19:13:59.97073	2026-04-30
106	12	3	2026-04-30 19:14:20.610335	2026-04-30 19:14:57.124608	2026-04-30
107	10	3	2026-04-30 19:15:39.213856	2026-04-30 19:22:08.636051	2026-04-30
108	11	3	2026-04-30 19:22:39.747706	2026-04-30 19:25:21.422888	2026-04-30
109	10	3	2026-04-30 19:26:05.818211	2026-04-30 19:26:26.476418	2026-04-30
110	11	3	2026-04-30 19:26:54.818188	\N	2026-04-30
111	9	3	2026-05-07 18:42:09.360172	2026-05-07 18:45:15.420707	2026-05-07
112	10	3	2026-05-07 18:46:25.694456	2026-05-07 18:47:57.49779	2026-05-07
113	12	3	2026-05-07 18:48:23.217713	2026-05-07 18:50:32.463541	2026-05-07
114	9	3	2026-05-07 18:50:53.051478	2026-05-07 19:02:51.092116	2026-05-07
115	12	3	2026-05-07 19:03:20.1573	\N	2026-05-07
116	9	3	2026-05-07 19:09:13.291545	\N	2026-05-07
117	11	3	2026-05-07 19:10:34.347726	\N	2026-05-07
118	12	3	2026-05-07 19:37:09.373585	\N	2026-05-07
\.


--
-- TOC entry 5520 (class 0 OID 19587)
-- Dependencies: 270
-- Data for Name: barcodes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.barcodes (id, order_id, purchase_order_id, company_id, item_name, hsn, purchased_date, mfg_date, exp_date, qr_number, barcode_data, created_at, purchase_order_item_id) FROM stdin;
5	\N	17	1	TestItem	1234	2026-03-16	2026-03-16	2027-03-16	QR00000005 	ITEM DETAILS\nJSON Data: {"quantity": 5}	2026-03-16 13:04:52.872611	17
6	\N	18	1	Ms sheet	12367	2026-03-16	2024-11-12	2028-11-11	QR00000006 	ITEM DETAILS\nItem Name: Ms sheet\nHSN: 12367\nPurchased Date: 2026-03-16\nManufacturing Date: 2024-11-12\nExpiry Date: 2028-11-11\nQuantity: 1\nBatch Number: N/A\nMaterial Info: N/A\n\nJSON Data: {"item_name":"Ms sheet","hsn":"12367","purchased_date":"2026-03-16","mfg_date":"2024-11-12","exp_date":"2028-11-11","quantity":1,"batch_number":null,"material_info":null}	2026-03-16 13:16:38.932908	18
7	\N	21	2	Chain	87149990	2026-04-09	\N	\N	QR00000007 	ITEM DETAILS\nItem Name: Chain\nHSN: 87149990\nPurchased Date: 2026-04-09\nExpiry: No Expiry\nQuantity: 1\nBatch Number: 88383\nNote: N/A\nMaterial Info: Ueje\n\nJSON Data: {"item_name":"Chain","hsn":"87149990","purchased_date":"2026-04-09","mfg_date":null,"exp_date":null,"has_expiry":false,"quantity":1,"batch_number":"88383","note":null,"material_info":"Ueje"}	2026-04-10 01:57:06.09837	25
8	\N	21	2	Chain	87149990	2026-04-10	\N	\N	QR00000008	Item: Chain\nQty: 5\nDate: 2026-04-09T21:17:12.523Z\nJSON Data: {"item_name":"Chain","hsn":"87149990","quantity":5,"unit":"","company_id":"2","receipt_id":28,"purchase_order_id":"21"}	2026-04-10 02:47:12.518003	\N
9	\N	21	2	Handle	8714	2026-04-10	\N	\N	QR00000009	Item: Handle\nQty: 6\nDate: 2026-04-09T21:17:12.525Z\nJSON Data: {"item_name":"Handle","hsn":"8714","quantity":6,"unit":"","company_id":"2","receipt_id":28,"purchase_order_id":"21"}	2026-04-10 02:47:12.518003	\N
10	\N	21	2	Rim	871492	2026-04-10	\N	\N	QR00000010	Item: Rim\nQty: 4\nDate: 2026-04-09T21:17:12.526Z\nJSON Data: {"item_name":"Rim","hsn":"871492","quantity":4,"unit":"","company_id":"2","receipt_id":28,"purchase_order_id":"21"}	2026-04-10 02:47:12.518003	\N
11	\N	21	2	Cassette	871493	2026-04-10	\N	\N	QR00000011	Item: Cassette\nQty: 5\nDate: 2026-04-09T21:17:12.528Z\nJSON Data: {"item_name":"Cassette","hsn":"871493","quantity":5,"unit":"","company_id":"2","receipt_id":28,"purchase_order_id":"21"}	2026-04-10 02:47:12.518003	\N
12	\N	23	2	Wheel set	\N	2026-04-10	\N	\N	QR00000012	Item: Wheel set\nQty: 2\nDate: 2026-04-09T21:19:48.205Z\nJSON Data: {"item_name":"Wheel set","hsn":"","quantity":2,"unit":"","company_id":"2","receipt_id":29,"purchase_order_id":"23"}	2026-04-10 02:49:48.202828	\N
13	\N	23	2	Cassette	871493	2026-04-10	\N	\N	QR00000013	Item: Cassette\nQty: 1\nDate: 2026-04-09T21:19:48.207Z\nJSON Data: {"item_name":"Cassette","hsn":"871493","quantity":1,"unit":"","company_id":"2","receipt_id":29,"purchase_order_id":"23"}	2026-04-10 02:49:48.202828	\N
14	\N	23	2	Handle	8714	2026-04-10	\N	\N	QR00000014	Item: Handle\nQty: 3\nDate: 2026-04-09T21:19:48.208Z\nJSON Data: {"item_name":"Handle","hsn":"8714","quantity":3,"unit":"","company_id":"2","receipt_id":29,"purchase_order_id":"23"}	2026-04-10 02:49:48.202828	\N
15	\N	23	2	Rim	871492	2026-04-10	\N	\N	QR00000015	Item: Rim\nQty: 6\nDate: 2026-04-09T21:19:48.210Z\nJSON Data: {"item_name":"Rim","hsn":"871492","quantity":6,"unit":"","company_id":"2","receipt_id":29,"purchase_order_id":"23"}	2026-04-10 02:49:48.202828	\N
16	\N	25	3	Plastic	543	2026-04-30	\N	\N	QR00000016	Item: Plastic\nQty: 5\nDate: 2026-04-30T13:59:25.765Z\nJSON Data: {"item_name":"Plastic","hsn":"543","quantity":5,"unit":"","company_id":"3","receipt_id":30,"purchase_order_id":"25"}	2026-04-30 19:29:25.751725	\N
\.


--
-- TOC entry 5506 (class 0 OID 19307)
-- Dependencies: 256
-- Data for Name: bid_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bid_items (id, bid_id, demand_item_id, unit_price, total_price, created_at) FROM stdin;
\.


--
-- TOC entry 5476 (class 0 OID 18849)
-- Dependencies: 226
-- Data for Name: bill_of_materials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bill_of_materials (id, project_id, serial_number, material_name, quantity, unit, hsn, notes, created_at, estimated_cost, supplier) FROM stdin;
1	5	\N	Cassette	2.00	units	871493	\N	2026-04-10 12:31:32.940223	\N	\N
2	6	\N	Steel Rod	2.00	nos	234	\N	2026-04-29 19:40:56.487105	\N	\N
3	6	\N	Plastic	5.00	bag	543	\N	2026-04-29 19:40:56.533705	\N	\N
\.


--
-- TOC entry 5470 (class 0 OID 18781)
-- Dependencies: 220
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.companies (id, name, email, gst_number, created_at, updated_at) FROM stdin;
1	Subhash Engineering 	saurabh102@gmail.com	1234567890OYDGG	2026-02-04 01:41:20.152247	2026-02-04 01:41:20.152247
2	Shuhita Engineering	mmt@gmail.com	12SF54356CF7888	2026-04-09 21:57:51.701247	2026-04-09 21:57:51.701247
3	Suhas Engineering 	patilakshata758@gmail.com	\N	2026-04-29 18:40:12.17774	2026-04-29 18:40:12.17774
\.


--
-- TOC entry 5502 (class 0 OID 19254)
-- Dependencies: 252
-- Data for Name: demand_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.demand_items (id, demand_id, serial_number, item_name, quantity, unit, hsn, notes, created_at) FROM stdin;
\.


--
-- TOC entry 5486 (class 0 OID 18977)
-- Dependencies: 236
-- Data for Name: enquiries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.enquiries (id, enquiry_number, company_id, uploaded_by, pdf_filename, pdf_path, status, notes, created_at, updated_at, assigned_to, quotation_filename, quotation_path, quotation_uploaded_at, po_filename, po_path, po_uploaded_at, customer_remarks) FROM stdin;
1	EN0001	1	1	BCS702-module-3-textbook.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\EN0001_BCS702-module-3-textbook.pdf	accepted_by_customer	Go	2026-02-04 03:01:57.876177	2026-02-13 00:01:47.148615	2	BCS702-module-3-textbook.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\QUOT_EN0001_BCS702-module-3-textbook.pdf	2026-02-05 01:26:03.471414	PO_EN0001_5%20AND%207%20RV.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0001_5%20AND%207%20RV.pdf	2026-02-13 00:01:47.100643	\N
2	EN0002	1	1	GST%20Management%20ERP%20System%20(2).pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\EN0002_GST%20Management%20ERP%20System%20(2).pdf	sent_to_npd	\N	2026-02-28 16:12:07.213846	2026-03-14 11:57:30.469221	2	\N	\N	\N	\N	\N	\N	\N
9	EN0001	2	5	AdmitCard-260311264917.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\EN0006_AdmitCard-260311264917.pdf	accepted_by_customer	Nice	2026-04-09 22:06:52.527489	2026-04-09 22:26:30.637524	6	cred_1.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\QUOT_EN0001_cred_1.pdf	2026-04-09 22:25:35.016778	PO_EN0001_145-Conduct%20of%20Intermediate%20Reviews%20and%20entry%20of%20CIE%20Marks.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0001_145-Conduct%20of%20Intermediate%20Reviews%20and%20entry%20of%20CIE%20Marks.pdf	2026-04-09 22:26:30.618568	Gjd
3	EN0003	1	1	BCS702-module-3-textbook-6.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\EN0003_BCS702-module-3-textbook-6.pdf	completed	Go	2026-02-28 16:25:07.7473	2026-03-14 12:00:34.448573	2	1773340542017.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\QUOT_EN0003_1773340542017.pdf	2026-03-14 11:59:47.721139	\N	\N	\N	\N
4	EN0004	1	1	1773340542017.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\EN0004_1773340542017.pdf	completed	Go ahead	2026-03-16 14:47:45.743657	2026-03-16 14:52:13.00859	2	1773340542017.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\QUOT_EN0004_1773340542017.pdf	2026-03-16 14:49:15.054092	PO_EN0004_Assignment7.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0004_Assignment7.pdf	2026-03-16 14:52:13.00859	\N
5	EN0005	1	1	Module-2-updated.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\EN0005_Module-2-updated.pdf	accepted_by_customer	Go ahead	2026-04-09 21:28:22.482347	2026-04-09 21:48:06.178256	2	1773340542017-2.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\QUOT_EN0005_1773340542017-2.pdf	2026-04-09 21:39:56.105839	PO_EN0005_1773340542017-1.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0005_1773340542017-1.pdf	2026-04-09 21:48:06.134624	\N
10	EN0002	2	5	wc_1ve23cs082.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\EN0002_wc_1ve23cs082.pdf	accepted_by_customer	Fine, works for us	2026-04-10 02:23:47.526289	2026-04-10 02:26:52.751509	6	Assignment10.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\QUOT_EN0002_Assignment10.pdf	2026-04-10 02:24:42.509347	PO_EN0002_1773340542017.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0002_1773340542017.pdf	2026-04-10 02:26:52.691452	\N
11	EN0003	2	5	wc_1ve23cs082.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\EN0003_wc_1ve23cs082.pdf	accepted_by_customer	Go	2026-04-10 12:28:14.465098	2026-04-10 12:30:17.028938	6	BCS702-module-3-textbook-7.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\QUOT_EN0003_BCS702-module-3-textbook-7.pdf	2026-04-10 12:28:46.065747	PO_EN0003_BCS702-module-3-textbook-8.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0003_BCS702-module-3-textbook-8.pdf	2026-04-10 12:30:16.970865	\N
12	EN0001	3	9	GST%20Management%20ERP%20System%20(1).pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\EN0001_GST%20Management%20ERP%20System%20(1).pdf	accepted_by_customer	\N	2026-04-29 19:03:27.596444	2026-04-29 19:21:09.152094	12	GST%20Management%20ERP%20System%20(1).pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\QUOT_EN0001_GST%20Management%20ERP%20System%20(1).pdf	2026-04-29 19:07:15.994958	PO_EN0001_CSE_Major%20Project%20Phase-2%20Synopsis.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0001_CSE_Major%20Project%20Phase-2%20Synopsis.pdf	2026-04-29 19:21:09.083743	\N
13	EN0002	3	9	1510261.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\EN0002_1510261.pdf	accepted_by_customer	\N	2026-05-07 19:16:18.76352	2026-05-07 19:24:43.724069	12	GST%2520Management%2520ERP%2520System%2520(1).pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\QUOT_EN0002_GST%2520Management%2520ERP%2520System%2520(1).pdf	2026-05-07 19:18:13.971337	PO_EN0002_GST%2520Management%2520ERP%2520System%2520(1).pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0002_GST%2520Management%2520ERP%2520System%2520(1).pdf	2026-05-07 19:24:43.675032	\N
\.


--
-- TOC entry 5480 (class 0 OID 18896)
-- Dependencies: 230
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory (id, company_id, item_name, quantity, unit, hsn, last_updated, last_updated_at, created_at) FROM stdin;
19	1	Qwer	2.00		12345	2026-03-16 02:06:11.05926	2026-03-16 12:27:11.128461	2026-03-16 12:27:11.128461
20	1	Trew	3.00	ltr	12347	2026-03-16 02:10:33.829937	2026-03-16 12:27:11.128461	2026-03-16 12:27:11.128461
21	1	TestItem	5.00	units	1234	2026-03-16 13:04:52.881372	2026-03-16 13:04:52.881372	2026-03-16 13:04:52.881372
22	1	Ms sheet	1.00	units	12367	2026-03-16 13:16:38.940106	2026-03-16 13:16:38.940106	2026-03-16 13:16:38.940106
23	2	Chain	10.00	units	87149990	2026-04-10 01:56:22.864402	2026-04-10 02:47:12.518003	2026-04-10 01:56:22.864402
27	2	Wheel set	2.00	units	\N	2026-04-10 02:49:48.202828	2026-04-10 02:49:48.202828	2026-04-10 02:49:48.202828
26	2	Cassette	11.00	units	871493	2026-04-10 01:56:22.864402	2026-04-10 02:49:48.202828	2026-04-10 01:56:22.864402
24	2	Handle	13.00	units	8714	2026-04-10 01:56:22.864402	2026-04-10 02:49:48.202828	2026-04-10 01:56:22.864402
25	2	Rim	16.00	units	871492	2026-04-10 01:56:22.864402	2026-04-10 02:49:48.202828	2026-04-10 01:56:22.864402
28	3	Plastic	5.00	units	543	2026-04-30 19:29:25.751725	2026-04-30 19:29:25.751725	2026-04-30 19:29:25.751725
\.


--
-- TOC entry 5510 (class 0 OID 19395)
-- Dependencies: 260
-- Data for Name: major_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.major_orders (id, company_id, materials_detail_id, vendor_id, item_name, hsn, quantity, unit, unit_price, total_price, status, order_date, expected_delivery_date, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5492 (class 0 OID 19089)
-- Dependencies: 242
-- Data for Name: master_materials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.master_materials (id, business_name, material_name, hsn_code, gst_rate, material_rate, unit, created_at, updated_at, company_id) FROM stdin;
2	Main	Qwer	12345	5.00	56.00	box	2026-02-26 01:19:14.024785	2026-02-26 01:19:14.024785	1
3	Main	Trew	12347	10.00	235.00	ltr	2026-02-26 01:19:14.035239	2026-02-26 01:19:14.035239	1
4	Main	Ms sheet	12367	5.00	23.00	mt	2026-02-28 16:18:41.908151	2026-02-28 16:18:41.908151	1
5	Main	Frame	871491	0.00	0.00	kg	2026-04-09 22:50:28.362157	2026-04-09 22:50:28.362157	2
6	Main	Wheelset	8714	0.00	0.00	kg	2026-04-09 22:50:28.366999	2026-04-09 22:50:28.366999	2
7	Main	Rim	871492	0.00	0.00	kg	2026-04-09 22:50:28.367447	2026-04-09 22:50:28.367447	2
8	Main	Handle	8714	0.00	0.00	kg	2026-04-09 22:50:28.367955	2026-04-09 22:50:28.367955	2
9	Main	Chain	87149990	0.00	0.00	kg	2026-04-09 22:50:28.368477	2026-04-09 22:50:28.368477	2
10	Main	Cassette	871493	0.00	0.00	kg	2026-04-09 22:50:28.368925	2026-04-09 22:50:28.368925	2
11	Main	Brakes	871494	0.00	0.00	kg	2026-04-09 22:50:28.369336	2026-04-09 22:51:24.157899	2
12	Main	Plastic	543	0.00	0.00	kg	2026-04-30 19:16:37.608945	2026-04-30 19:16:55.305445	3
\.


--
-- TOC entry 5494 (class 0 OID 19107)
-- Dependencies: 244
-- Data for Name: master_vendors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.master_vendors (id, name, email, phone_number, address, created_at, updated_at, company_id) FROM stdin;
1	Gaurav 	gk@gmail.com	8651789625	Fgdfjr6ujey	2026-02-26 01:35:00.558497	2026-02-26 01:35:00.558497	1
2	Mansa	miapp@gmail.com	1236548970	Vsksmshms	2026-04-09 22:42:48.538861	2026-04-09 22:42:48.538861	2
3	Raju s	r@gmail.com	3685986883	 Sbsmsj cm	2026-04-09 22:42:48.54239	2026-04-09 22:42:48.54239	2
4	XYZ	patilakshata758@gmail.com	8660363145	Bengaluru 	2026-04-30 19:12:37.233136	2026-04-30 19:12:46.143414	3
5	ABC	app@gmail.com	9652354825	Bengaluru 	2026-04-30 19:13:31.262073	2026-04-30 19:13:31.262073	3
\.


--
-- TOC entry 5508 (class 0 OID 19338)
-- Dependencies: 258
-- Data for Name: materials_detail; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.materials_detail (id, company_id, demand_id, demand_item_id, bid_id, vendor_id, item_name, quantity, unit, hsn, unit_price, total_price, supply_until_date, vendor_name, vendor_gstin, status, notes, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5514 (class 0 OID 19467)
-- Dependencies: 264
-- Data for Name: minor_order_bids; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.minor_order_bids (id, minor_order_id, vendor_id, unit_price, total_price, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5512 (class 0 OID 19435)
-- Dependencies: 262
-- Data for Name: minor_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.minor_orders (id, company_id, item_name, hsn, quantity, unit, deadline_date, status, selected_vendor_id, selected_bid_id, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5478 (class 0 OID 18873)
-- Dependencies: 228
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, title, message, type, is_read, created_at, project_id) FROM stdin;
1	1	New Employee Signup	Raghu (npd) has requested to join your company and needs approval.	employee_signup	t	2026-02-04 02:18:21.23624	\N
3	2	New Enquiry Assigned	Enquiry EN0001 has been assigned to you for review. File: BCS702-module-3-textbook.pdf	enquiry_assigned	t	2026-02-04 03:20:56.722585	\N
2	2	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	t	2026-02-04 02:41:11.102132	\N
5	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0001. Remarks: Go	quotation_review	t	2026-02-05 01:38:08.201631	\N
7	2	Customer Decision Recorded	Customer final decision for enquiry EN0001: accepted by customer. 	customer_decision	f	2026-02-12 23:52:34.620406	\N
9	2	Customer Decision Recorded	Customer final decision for enquiry EN0001: accepted by customer. 	customer_decision	t	2026-02-13 00:01:47.150744	\N
8	2	New Project Created	A new project Project EN0001 has been auto-created for enquiry EN0001 after PO upload.	project_created	t	2026-02-13 00:01:47.106401	1
6	2	PO Uploaded	A Purchase Order has been uploaded for enquiry EN0001.	po_uploaded	t	2026-02-12 23:52:34.58851	\N
13	4	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	t	2026-02-28 01:55:57.706954	\N
14	2	New Enquiry Assigned	Enquiry EN0002 has been assigned to you for review. File: GST%20Management%20ERP%20System%20(2).pdf	enquiry_assigned	f	2026-03-14 11:57:30.456317	\N
15	2	New Enquiry Assigned	Enquiry EN0003 has been assigned to you for review. File: BCS702-module-3-textbook-6.pdf	enquiry_assigned	f	2026-03-14 11:57:48.74668	\N
16	1	Quotation Uploaded	A quotation has been uploaded for enquiry EN0003 by NPD user undefined.	quotation_uploaded	t	2026-03-14 11:59:47.722428	\N
17	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0003. Remarks: Go	quotation_review	f	2026-03-14 12:00:34.449665	\N
19	3	Partial Order Receipt	Order SE000000014 has been partially received and requires your review for pricing/GST.	info	t	2026-03-16 02:10:33.829937	\N
25	2	New Enquiry Assigned	Enquiry EN0004 has been assigned to you for review. File: 1773340542017.pdf	enquiry_assigned	f	2026-03-16 14:48:00.126121	\N
27	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0004. Remarks: Go ahead	quotation_review	f	2026-03-16 14:50:35.779318	\N
26	1	Quotation Uploaded	A quotation has been uploaded for enquiry EN0004 by NPD user undefined.	quotation_uploaded	t	2026-03-16 14:49:15.056059	\N
12	1	New Employee Signup	Ankit (store_incharge) has requested to join your company and needs approval.	employee_signup	t	2026-02-28 01:55:34.690351	\N
10	1	New Employee Signup	Ravish  (accountant) has requested to join your company and needs approval.	employee_signup	t	2026-02-26 00:52:57.730393	\N
4	1	Quotation Uploaded	A quotation has been uploaded for enquiry EN0001 by NPD user undefined.	quotation_uploaded	t	2026-02-05 01:26:03.473985	\N
22	3	Partial Order Receipt	Order SE000000013 has been partially received and requires your review for pricing/GST.	info	t	2026-03-16 13:09:05.854698	\N
23	3	Partial Order Receipt	Order SE000000018 has been partially received and requires your review for pricing/GST.	info	t	2026-03-16 13:12:05.115868	\N
21	3	Partial Order Receipt	Order SE000000013 has been partially received and requires your review for pricing/GST.	info	t	2026-03-16 12:53:03.539186	\N
20	3	Order Fully Received	Order SE000000014 has been fully received and requires your review for pricing/GST.	info	t	2026-03-16 12:51:40.259483	\N
18	3	Order Fully Received	Order SE000000017 has been fully received and requires your review for pricing/GST.	info	t	2026-03-16 02:06:11.05926	\N
24	3	Partial Order Receipt	Order SE000000018 has been partially received and requires your review for pricing/GST.	info	t	2026-03-16 13:16:02.15597	\N
28	3	Order Fully Received	Order SE000000019 has been fully received and requires your review for pricing/GST.	info	t	2026-03-16 15:57:18.759996	\N
11	3	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	t	2026-02-26 00:53:38.785546	\N
29	2	New Enquiry Assigned	Enquiry EN0005 has been assigned to you for review. File: Module-2-updated.pdf	enquiry_assigned	f	2026-04-09 21:35:42.42759	\N
30	1	Quotation Uploaded	A quotation has been uploaded for enquiry EN0005 by NPD user undefined.	quotation_uploaded	f	2026-04-09 21:39:56.106946	\N
31	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0005. Remarks: Go ahead	quotation_review	f	2026-04-09 21:40:59.684504	\N
32	2	New Project Created	A new project PO0000000001 has been auto-created for enquiry EN0005 after PO upload.	project_created	f	2026-04-09 21:48:06.141484	2
33	2	Customer Decision Recorded	Customer final decision for enquiry EN0005: accepted by customer. 	customer_decision	f	2026-04-09 21:48:06.17989	\N
34	5	New Employee Signup	Aakash (npd) has requested to join your company and needs approval.	employee_signup	f	2026-04-09 22:20:25.909316	\N
36	5	New Employee Signup	Koustav (accountant) has requested to join your company and needs approval.	employee_signup	f	2026-04-09 22:22:13.140579	\N
38	5	New Employee Signup	Jyothi (store_incharge) has requested to join your company and needs approval.	employee_signup	f	2026-04-09 22:23:13.880538	\N
39	8	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	f	2026-04-09 22:23:24.75879	\N
40	6	New Enquiry Assigned	Enquiry EN0001 has been assigned to you for review. File: AdmitCard-260311264917.pdf	enquiry_assigned	t	2026-04-09 22:25:09.964768	\N
41	5	Quotation Uploaded	A quotation has been uploaded for enquiry EN0001 by NPD user undefined.	quotation_uploaded	f	2026-04-09 22:25:35.017877	\N
37	7	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	t	2026-04-09 22:22:21.070919	\N
45	7	Partial Order Receipt	Order SE000000021 has been partially received and requires your review for pricing/GST.	info	f	2026-04-10 01:56:22.864402	\N
47	5	Quotation Uploaded	A quotation has been uploaded for enquiry EN0002 by NPD user undefined.	quotation_uploaded	t	2026-04-10 02:24:42.510464	\N
46	6	New Enquiry Assigned	Enquiry EN0002 has been assigned to you for review. File: wc_1ve23cs082.pdf	enquiry_assigned	t	2026-04-10 02:23:58.346913	\N
44	6	Customer Decision Recorded	Customer final decision for enquiry EN0001: accepted by customer. Remarks: Gjd	customer_decision	t	2026-04-09 22:26:30.638706	\N
43	6	New Project Created	A new project PO0000000002 has been auto-created for enquiry EN0001 after PO upload.	project_created	t	2026-04-09 22:26:30.623355	3
42	6	Quotation Accepted	Management has accepted your quotation for enquiry EN0001. Remarks: Nice	quotation_review	t	2026-04-09 22:25:43.447133	\N
35	6	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	t	2026-04-09 22:21:26.945071	\N
48	6	Quotation Accepted	Management has accepted your quotation for enquiry EN0002. Remarks: Fine, works for us	quotation_review	f	2026-04-10 02:26:12.745659	\N
49	6	New Project Created	A new project POEN000210002 has been auto-created for enquiry EN0002 after PO upload.	project_created	f	2026-04-10 02:26:52.696583	4
50	6	Customer Decision Recorded	Customer final decision for enquiry EN0002: accepted by customer. 	customer_decision	f	2026-04-10 02:26:52.752741	\N
51	7	New Requirement Received	New requirement "Requirements for Project ID: 4" received.	requirement_received	f	2026-04-10 02:36:05.505425	4
52	7	New Requirements Received	You have received new requirements: Requirements for Project ID: 4 	info	t	2026-04-10 02:36:05.506654	4
53	7	Order Fully Received	Order SE000000021 has been fully received and requires your review for pricing/GST.	info	f	2026-04-10 02:47:12.518003	\N
54	7	Partial Order Receipt	Order SE000000023 has been partially received and requires your review for pricing/GST.	info	f	2026-04-10 02:49:48.202828	\N
55	6	New Enquiry Assigned	Enquiry EN0003 has been assigned to you for review. File: wc_1ve23cs082.pdf	enquiry_assigned	f	2026-04-10 12:28:26.134709	\N
56	5	Quotation Uploaded	A quotation has been uploaded for enquiry EN0003 by NPD user undefined.	quotation_uploaded	f	2026-04-10 12:28:46.067179	\N
57	6	Quotation Accepted	Management has accepted your quotation for enquiry EN0003. Remarks: Go	quotation_review	f	2026-04-10 12:29:19.521303	\N
58	6	New Project Created	A new project POEN0003210003 has been auto-created for enquiry EN0003 after PO upload.	project_created	f	2026-04-10 12:30:16.984911	5
60	7	New Requirement Received	New requirement "Requirements for Project ID: 5" received.	requirement_received	f	2026-04-10 12:33:16.669665	5
61	7	New Requirements Received	You have received new requirements: Requirements for Project ID: 5 	info	f	2026-04-10 12:33:16.671828	5
59	6	Customer Decision Recorded	Customer final decision for enquiry EN0003: accepted by customer. 	customer_decision	t	2026-04-10 12:30:17.031448	\N
63	9	New Employee Signup	Bhavana (store_incharge) has requested to join your company and needs approval.	employee_signup	t	2026-04-29 18:47:44.688101	\N
65	12	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	t	2026-04-29 18:55:22.71462	\N
62	9	New Employee Signup	Arya (accountant) has requested to join your company and needs approval.	employee_signup	t	2026-04-29 18:44:07.962897	\N
69	9	Quotation Uploaded	A quotation has been uploaded for enquiry EN0001 by NPD user undefined.	quotation_uploaded	t	2026-04-29 19:07:15.999377	\N
64	9	New Employee Signup	Koustav  (npd) has requested to join your company and needs approval.	employee_signup	t	2026-04-29 18:54:45.313812	\N
70	12	Quotation Accepted	Management has accepted your quotation for enquiry EN0001. 	quotation_review	t	2026-04-29 19:12:08.134737	\N
68	12	New Enquiry Assigned	Enquiry EN0001 has been assigned to you for review. File: GST%20Management%20ERP%20System%20(1).pdf	enquiry_assigned	t	2026-04-29 19:04:23.607819	\N
71	12	New Project Created	A new project POEN00010001 has been auto-created for enquiry EN0001 after PO upload.	project_created	f	2026-04-29 19:21:09.10269	6
72	12	Customer Decision Recorded	Customer final decision for enquiry EN0001: accepted by customer. 	customer_decision	f	2026-04-29 19:21:09.155204	\N
74	12	Project Status Updated	Project "POEN00010001" status updated to: IN PROGRESS	status_update	f	2026-04-29 19:26:37.956521	6
76	12	Project Status Updated	Project "POEN00010001" status updated to: PENDING	status_update	f	2026-04-29 19:26:42.061371	6
78	12	Project Status Updated	Project "POEN00010001" status updated to: IN PROGRESS	status_update	f	2026-04-29 19:26:45.596562	6
79	10	New Requirement Received	New requirement "Requirements for Project ID: 6" received.	requirement_received	t	2026-04-30 18:45:54.877271	6
80	10	New Requirements Received	You have received new requirements: Requirements for Project ID: 6 	info	t	2026-04-30 18:45:54.879629	6
81	12	Requirement Status Updated	Requirement "Requirements for Project ID: 6" status updated to: REVIEWED	requirement_status	t	2026-04-30 18:47:26.53898	6
67	10	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	t	2026-04-29 18:55:29.320552	\N
82	12	Requirement Status Updated	Requirement "Requirements for Project ID: 6" status updated to: FULFILLED	requirement_status	f	2026-04-30 18:51:26.02034	6
66	11	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	t	2026-04-29 18:55:26.398125	\N
77	9	Project Status Updated	Project "POEN00010001" status updated to: IN PROGRESS	status_update	t	2026-04-29 19:26:45.594453	6
75	9	Project Status Updated	Project "POEN00010001" status updated to: PENDING	status_update	t	2026-04-29 19:26:42.059695	6
73	9	Project Status Updated	Project "POEN00010001" status updated to: IN PROGRESS	status_update	t	2026-04-29 19:26:37.954115	6
83	10	Order Fully Received	Order SE000000025 has been fully received and requires your review for pricing/GST.	info	f	2026-04-30 19:29:25.751725	\N
84	12	New Enquiry Assigned	Enquiry EN0002 has been assigned to you for review. File: 1510261.pdf	enquiry_assigned	f	2026-05-07 19:17:22.891938	\N
86	12	Quotation Accepted	Management has accepted your quotation for enquiry EN0002. 	quotation_review	f	2026-05-07 19:18:43.709715	\N
87	12	Customer Decision Recorded	Customer final decision for enquiry EN0002: accepted by customer. 	customer_decision	f	2026-05-07 19:19:54.382671	\N
85	9	Quotation Uploaded	A quotation has been uploaded for enquiry EN0002 by NPD user undefined.	quotation_uploaded	t	2026-05-07 19:18:13.974221	\N
88	12	New Project Created	A new project POEN000210002 has been auto-created for enquiry EN0002 after PO upload.	project_created	f	2026-05-07 19:24:43.681523	7
89	12	Customer Decision Recorded	Customer final decision for enquiry EN0002: accepted by customer. 	customer_decision	f	2026-05-07 19:24:43.725407	\N
90	9	Project Status Updated	Project "POEN000210002" status updated to: IN PROGRESS	status_update	f	2026-05-07 19:27:17.761543	7
91	12	Project Status Updated	Project "POEN000210002" status updated to: IN PROGRESS	status_update	f	2026-05-07 19:27:17.762466	7
92	9	Project Status Updated	Project "POEN000210002" status updated to: PENDING	status_update	f	2026-05-07 19:27:20.959122	7
93	12	Project Status Updated	Project "POEN000210002" status updated to: PENDING	status_update	f	2026-05-07 19:27:20.959962	7
\.


--
-- TOC entry 5518 (class 0 OID 19540)
-- Dependencies: 268
-- Data for Name: order_receipt_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_receipt_items (id, receipt_id, order_id, item_name, hsn, quantity_ordered, quantity_received, unit, unit_price, gst_rate, gst_amount, total_amount, created_at, purchase_order_item_id) FROM stdin;
19	19	\N	Qwer	12345	0.00	2.00		\N	\N	\N	\N	2026-03-16 02:06:11.05926	17
20	20	\N	Trew	12347	5.00	3.00	ltr	\N	\N	\N	\N	2026-03-16 02:10:33.829937	14
21	21	\N	Trew	12347	5.00	2.00	ltr	\N	\N	\N	\N	2026-03-16 12:51:40.259483	14
22	22	\N	Trew	12347	11.00	5.00	ltr	\N	\N	\N	\N	2026-03-16 12:53:03.539186	13
23	23	\N	Trew	12347	11.00	3.00	ltr	\N	\N	\N	\N	2026-03-16 13:09:05.854698	13
24	24	\N	Ms sheet	12367	3.00	1.00		\N	\N	\N	\N	2026-03-16 13:12:05.115868	18
25	25	\N	Ms sheet	12367	3.00	1.00		\N	\N	\N	\N	2026-03-16 13:16:02.15597	18
26	26	\N	Ms sheet	12367	5.00	5.00		\N	\N	\N	\N	2026-03-16 15:57:18.759996	19
27	27	\N	Chain	87149990	10.00	5.00		\N	\N	\N	\N	2026-04-10 01:56:22.864402	25
28	27	\N	Handle	8714	10.00	4.00		\N	\N	\N	\N	2026-04-10 01:56:22.864402	26
29	27	\N	Rim	871492	10.00	6.00		\N	\N	\N	\N	2026-04-10 01:56:22.864402	27
30	27	\N	Cassette	871493	10.00	5.00		\N	\N	\N	\N	2026-04-10 01:56:22.864402	28
31	28	\N	Chain	87149990	10.00	5.00		\N	\N	\N	\N	2026-04-10 02:47:12.518003	25
32	28	\N	Handle	8714	10.00	6.00		\N	\N	\N	\N	2026-04-10 02:47:12.518003	26
33	28	\N	Rim	871492	10.00	4.00		\N	\N	\N	\N	2026-04-10 02:47:12.518003	27
34	28	\N	Cassette	871493	10.00	5.00		\N	\N	\N	\N	2026-04-10 02:47:12.518003	28
35	29	\N	Wheel set	\N	10.00	2.00		\N	\N	\N	\N	2026-04-10 02:49:48.202828	32
36	29	\N	Cassette	871493	10.00	1.00		\N	\N	\N	\N	2026-04-10 02:49:48.202828	29
37	29	\N	Handle	8714	10.00	3.00		\N	\N	\N	\N	2026-04-10 02:49:48.202828	30
38	29	\N	Rim	871492	10.00	6.00		\N	\N	\N	\N	2026-04-10 02:49:48.202828	31
39	30	\N	Plastic	543	5.00	5.00		\N	\N	\N	\N	2026-04-30 19:29:25.751725	33
\.


--
-- TOC entry 5516 (class 0 OID 19502)
-- Dependencies: 266
-- Data for Name: order_receipts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_receipts (id, order_id, company_id, bill_image_url, receipt_date, total_amount, total_gst_amount, status, submitted_by, approved_by, notes, created_at, updated_at, purchase_order_id, gross_weight, tare_weight, net_weight, vehicle_weight_unit, receipt_status, total_quantity_received) FROM stdin;
19	\N	1	/uploads/bills/bill-1773606970835-658763854.jpeg	2026-03-16	\N	\N	pending	4	\N	\N	2026-03-16 02:06:11.05926	2026-03-16 02:06:11.05926	17	\N	\N	\N	kg	complete	2.00
20	\N	1	/uploads/bills/bill-1773607233616-153137823.jpeg	2026-03-16	\N	\N	pending	4	\N	\N	2026-03-16 02:10:33.829937	2026-03-16 02:10:33.829937	14	\N	\N	\N	kg	partial	3.00
21	\N	1	/uploads/bills/bill-1773645700086-375445236.jpeg	2026-03-16	\N	\N	pending	4	\N	\N	2026-03-16 12:51:40.259483	2026-03-16 12:51:40.259483	14	\N	\N	\N	kg	complete	2.00
22	\N	1	/uploads/bills/bill-1773645783385-206035183.jpeg	2026-03-16	\N	\N	pending	4	\N	\N	2026-03-16 12:53:03.539186	2026-03-16 12:53:03.539186	13	\N	\N	\N	kg	partial	5.00
23	\N	1	/uploads/bills/bill-1773646745677-535673061.jpeg	2026-03-16	\N	\N	pending	4	\N	\N	2026-03-16 13:09:05.854698	2026-03-16 13:09:05.854698	13	\N	\N	\N	kg	partial	3.00
24	\N	1	/uploads/bills/bill-1773646924480-365831448.jpeg	2026-03-16	\N	\N	pending	4	\N	\N	2026-03-16 13:12:05.115868	2026-03-16 13:12:05.115868	18	\N	\N	\N	kg	partial	1.00
25	\N	1	/uploads/bills/bill-1773647161964-239276041.jpeg	2026-03-16	\N	\N	pending	4	\N	\N	2026-03-16 13:16:02.15597	2026-03-16 13:16:02.15597	18	\N	\N	\N	kg	partial	1.00
26	\N	1	/uploads/bills/bill-1773656838521-290400942.jpeg	2026-03-16	\N	\N	pending	4	\N	\N	2026-03-16 15:57:18.759996	2026-03-16 15:57:18.759996	19	\N	\N	\N	kg	complete	5.00
27	\N	2	/uploads/bills/bill-1775766382659-68137717.jpeg	2026-04-10	\N	\N	pending	8	\N	\N	2026-04-10 01:56:22.864402	2026-04-10 01:56:22.864402	21	\N	\N	\N	kg	partial	20.00
28	\N	2	/uploads/bills/bill-1775769432346-494427097.jpeg	2026-04-10	\N	\N	pending	8	\N	\N	2026-04-10 02:47:12.518003	2026-04-10 02:47:12.518003	21	\N	\N	\N	kg	complete	20.00
29	\N	2	/uploads/bills/bill-1775769587962-428565915.jpeg	2026-04-10	\N	\N	pending	8	\N	\N	2026-04-10 02:49:48.202828	2026-04-10 02:49:48.202828	23	\N	\N	\N	kg	partial	12.00
30	\N	3	/uploads/bills/bill-1777557565230-787743690.jpeg	2026-04-30	\N	\N	pending	11	\N	\N	2026-04-30 19:29:25.751725	2026-04-30 19:29:25.751725	25	54.00	25.00	29.00	kg	complete	5.00
\.


--
-- TOC entry 5482 (class 0 OID 18918)
-- Dependencies: 232
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, company_id, order_type, status, created_by, total_amount, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5484 (class 0 OID 18955)
-- Dependencies: 234
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_tokens (id, user_id, token, expires_at, used, created_at) FROM stdin;
1	1	f879f6ee-ddf0-4889-a788-a07002e166a2	2026-02-05 01:38:29.316	f	2026-02-05 01:23:29.31742
\.


--
-- TOC entry 5474 (class 0 OID 18820)
-- Dependencies: 224
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.projects (id, name, description, company_id, created_by, status, sketch_url, hsn_code, created_at, updated_at, po_number, assigned_to, priority, start_date, end_date, npd_user_id, project_id, po_filename, po_path) FROM stdin;
6	POEN00010001	Auto-created from Enquiry EN0001. PO uploaded by undefined.	3	12	in_progress	/uploads/sketch-1777471411876.jpg	\N	2026-04-29 19:21:09.094045	2026-04-29 19:33:32.015576	POEN00010001	12	medium	\N	\N	12	\N	PO_EN0001_CSE_Major%20Project%20Phase-2%20Synopsis.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0001_CSE_Major%20Project%20Phase-2%20Synopsis.pdf
1	PO-EN0001-7598	Auto-created from Enquiry EN0001. PO uploaded by undefined.	1	2	pending	/uploads/sketch-1770923702103.jpg	\N	2026-02-13 00:01:47.102149	2026-02-13 00:45:02.259205	PO-EN0001-7598	2	medium	\N	\N	2	\N	PO_EN0001_5%20AND%207%20RV.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0001_5%20AND%207%20RV.pdf
2	PO0000000001	Auto-created from Enquiry EN0005. PO uploaded by undefined.	1	2	pending	\N	\N	2026-04-09 21:48:06.137921	2026-04-09 21:48:06.137921	PO0000000001	2	medium	\N	\N	2	\N	PO_EN0005_1773340542017-1.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0005_1773340542017-1.pdf
3	POEN00010001	Auto-created from Enquiry EN0001. PO uploaded by undefined.	2	6	pending	\N	\N	2026-04-09 22:26:30.621559	2026-04-09 22:26:30.621559	POEN00010001	6	medium	\N	\N	6	\N	PO_EN0001_145-Conduct%20of%20Intermediate%20Reviews%20and%20entry%20of%20CIE%20Marks.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0001_145-Conduct%20of%20Intermediate%20Reviews%20and%20entry%20of%20CIE%20Marks.pdf
4	POEN000210002	Auto-created from Enquiry EN0002. PO uploaded by undefined.	2	6	pending	/uploads/sketch-1775768833730.jpg	\N	2026-04-10 02:26:52.694951	2026-04-10 02:37:13.798045	POEN000210002	6	medium	\N	\N	6	\N	PO_EN0002_1773340542017.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0002_1773340542017.pdf
7	POEN000210002	Auto-created from Enquiry EN0002. PO uploaded by undefined.	3	12	pending	\N	\N	2026-05-07 19:24:43.679464	2026-05-07 19:27:20.956452	POEN000210002	12	medium	\N	\N	12	\N	PO_EN0002_GST%2520Management%2520ERP%2520System%2520(1).pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0002_GST%2520Management%2520ERP%2520System%2520(1).pdf
5	POEN0003210003	Auto-created from Enquiry EN0003. PO uploaded by undefined.	2	6	pending	/uploads/sketch-1775804524047.jpg	\N	2026-04-10 12:30:16.979583	2026-04-10 12:32:04.270347	POEN0003210003	6	medium	\N	\N	6	\N	PO_EN0003_BCS702-module-3-textbook-8.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0003_BCS702-module-3-textbook-8.pdf
\.


--
-- TOC entry 5498 (class 0 OID 19154)
-- Dependencies: 248
-- Data for Name: purchase_order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchase_order_items (id, po_id, material_name, hsn, quantity, unit, unit_price, total_price, created_at, gst_rate) FROM stdin;
13	13	Trew	12347	11.00	ltr	235.00	2843.50	2026-02-28 11:53:21.841034	10.00
14	14	Trew	12347	5.00	ltr	235.00	1292.50	2026-02-28 16:19:51.7289	10.00
17	17	Qwer	12345	3.00		\N	0.00	2026-03-16 02:02:42.317128	0.00
18	18	Ms sheet	12367	3.00		\N	0.00	2026-03-16 13:11:08.51789	0.00
19	19	Ms sheet	12367	5.00		\N	0.00	2026-03-16 15:46:03.084026	0.00
25	21	Chain	87149990	10.00		\N	0.00	2026-04-09 23:37:36.047618	0.00
26	21	Handle	8714	10.00		\N	0.00	2026-04-09 23:37:36.047618	0.00
27	21	Rim	871492	10.00		\N	0.00	2026-04-09 23:37:36.047618	0.00
28	21	Cassette	871493	10.00		\N	0.00	2026-04-09 23:37:36.047618	0.00
29	23	Cassette	871493	10.00		\N	0.00	2026-04-10 00:37:12.328319	0.00
30	23	Handle	8714	10.00		\N	0.00	2026-04-10 00:37:12.328319	0.00
31	23	Rim	871492	10.00		\N	0.00	2026-04-10 00:37:12.328319	0.00
32	23	Wheel set		10.00		\N	0.00	2026-04-10 00:37:12.328319	0.00
33	25	Plastic	543	5.00		\N	0.00	2026-04-30 19:18:10.997061	0.00
\.


--
-- TOC entry 5496 (class 0 OID 19121)
-- Dependencies: 246
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchase_orders (id, company_id, master_vendor_id, vendor_name, vendor_email, total_amount, status, created_by, created_at, updated_at, po_number_sequential) FROM stdin;
13	1	1	Gaurav 	gk@gmail.com	2843.50	pending	3	2026-02-28 11:53:21.841034	2026-02-28 11:53:21.841034	1
14	1	1	Gaurav 	gk@gmail.com	1292.50	pending	3	2026-02-28 16:19:51.7289	2026-02-28 16:19:51.7289	2
17	1	1	Gaurav 	gk@gmail.com	0.00	pending	3	2026-03-16 02:02:42.317128	2026-03-16 02:02:42.317128	3
18	1	1	Gaurav 	gk@gmail.com	0.00	pending	3	2026-03-16 13:11:08.51789	2026-03-16 13:11:08.51789	4
19	1	1	Gaurav 	gk@gmail.com	0.00	pending	3	2026-03-16 15:46:03.084026	2026-03-16 15:46:03.084026	5
21	2	2	Mansa	miapp@gmail.com	0.00	pending	7	2026-04-09 23:37:36.047618	2026-04-09 23:37:36.047618	1
23	2	2	Mansa	miapp@gmail.com	0.00	pending	7	2026-04-10 00:37:12.328319	2026-04-10 00:37:12.328319	2
25	3	4	XYZ	patilakshata758@gmail.com	0.00	delivered	10	2026-04-30 19:18:10.997061	2026-04-30 19:26:13.620481	1
\.


--
-- TOC entry 5524 (class 0 OID 19672)
-- Dependencies: 274
-- Data for Name: requirement_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.requirement_items (id, requirement_id, serial_number, item_name, quantity, hsn, created_at) FROM stdin;
1	9	1	Steel bar	50kg	48445	2026-04-10 02:36:05.503478
2	10	1	Steel bar	50 kg	12585	2026-04-10 12:33:16.668147
3	11	1	Plastic	5.00	543	2026-04-30 18:45:54.872485
4	11	2	Steel Rod	2.00	234	2026-04-30 18:45:54.876149
\.


--
-- TOC entry 5522 (class 0 OID 19642)
-- Dependencies: 272
-- Data for Name: requirements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.requirements (id, title, priority, created_by, sent_to, project_id, status, created_at, updated_at) FROM stdin;
1	Requirements for Project ID: 1	medium	2	3	1	pending	2026-03-16 00:18:20.696363	2026-03-16 00:18:20.696363
2	Requirements for Project ID: 4	medium	6	7	4	pending	2026-04-10 02:27:58.138009	2026-04-10 02:27:58.138009
3	Requirements for Project ID: 4	medium	6	7	4	pending	2026-04-10 02:28:04.124084	2026-04-10 02:28:04.124084
4	Requirements for Project ID: 4	medium	6	7	4	pending	2026-04-10 02:29:34.485038	2026-04-10 02:29:34.485038
5	Requirements for Project ID: 4	medium	6	7	4	pending	2026-04-10 02:32:01.782529	2026-04-10 02:32:01.782529
6	Requirements for Project ID: 4	medium	6	7	4	pending	2026-04-10 02:32:19.258481	2026-04-10 02:32:19.258481
7	Requirements for Project ID: 4	medium	6	7	4	pending	2026-04-10 02:33:58.668248	2026-04-10 02:33:58.668248
8	Requirements for Project ID: 4	medium	6	7	4	pending	2026-04-10 02:35:11.341267	2026-04-10 02:35:11.341267
9	Requirements for Project ID: 4	medium	6	7	4	pending	2026-04-10 02:36:05.499718	2026-04-10 02:36:05.499718
10	Requirements for Project ID: 5	medium	6	7	5	pending	2026-04-10 12:33:16.663392	2026-04-10 12:33:16.663392
11	Requirements for Project ID: 6	medium	12	10	6	fulfilled	2026-04-30 18:45:54.864837	2026-04-30 18:51:26.01656
\.


--
-- TOC entry 5490 (class 0 OID 19062)
-- Dependencies: 240
-- Data for Name: revision_bom_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.revision_bom_items (id, revision_id, serial_number, material_name, quantity, unit, estimated_cost, supplier, notes, created_at) FROM stdin;
\.


--
-- TOC entry 5488 (class 0 OID 19036)
-- Dependencies: 238
-- Data for Name: revisions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.revisions (id, project_id, revision_number, sketch_url, notes, created_by, created_at) FROM stdin;
\.


--
-- TOC entry 5472 (class 0 OID 18794)
-- Dependencies: 222
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, password, role, company_id, created_at, updated_at, is_approved, approved_by, approved_at) FROM stdin;
1	Subhash 	saurabh102@gmail.com	$2a$10$b8sJV8V8uxil92SSXTb7fONMwQso6E0VXD0BnKiY7R8l2uhtm6CzG	management	1	2026-02-04 01:41:20.155419	2026-02-04 01:41:20.155419	t	\N	2026-02-04 01:41:20.155419
2	Raghu	npd@gmail.com	$2a$10$C0nPfmN/SKZyK0Em9yC2t.UaOm515QQeFPvYS2x3K6f/BQnTvyAvq	npd	1	2026-02-04 02:18:21.23419	2026-02-04 02:18:21.23419	t	1	2026-02-04 02:41:11.100663
3	Ravish 	acc@gmail.com	$2a$10$97nuJDEdU6gvFeHEQ0bzcuKTA59Mk6jPSc2pCHBb.K4T2xy5gU9fG	accountant	1	2026-02-26 00:52:57.712888	2026-02-26 00:52:57.712888	t	1	2026-02-26 00:53:38.780058
4	Ankit	si@gmail.com	$2a$10$66pYU/ZICemmrHJb0MlV2uEwV7gn36.7ra/vJNpJ0OjnCjQzaEhim	store_incharge	1	2026-02-28 01:55:34.682533	2026-02-28 01:55:34.682533	t	1	2026-02-28 01:55:57.703177
5	Meghana	mmt@gmail.com	$2a$10$f5XiJRew.DdhTyc6s.0gZeiKCHsYYBHGzRDDk0jwS2MrPsu3uGKAK	management	2	2026-04-09 21:57:51.703652	2026-04-09 21:57:51.703652	t	\N	2026-04-09 21:57:51.702
6	Aakash	ak@gmail.com	$2a$10$8jq6uKz79re.R5IyDT7mE.2U0BBHSwf.Y6k6cOiRUAOnQreUvbTSS	npd	2	2026-04-09 22:20:25.907612	2026-04-09 22:20:25.907612	t	5	2026-04-09 22:21:26.941402
7	Koustav	kd@gmail.com	$2a$10$nWFXUspx0YuiJ7dkzRW31enWk68XSBl96pZ1TSYhf5irb4c.vj/VW	accountant	2	2026-04-09 22:22:13.138843	2026-04-09 22:22:13.138843	t	5	2026-04-09 22:22:21.067786
8	Jyothi	jsi@gmail.com	$2a$10$5g6AOruKWNf2bhgkvNKnhuKfQkebiDLX6K0QC057kyRuIf28Vs.fm	store_incharge	2	2026-04-09 22:23:13.878829	2026-04-09 22:23:13.878829	t	5	2026-04-09 22:23:24.75554
9	Akshata 	patilakshata758@gmail.com	$2a$10$PU.oeutoSSjolZRS9uFUkunpklS2ZSRYHKI9Va6XyPj5ev.w3VucS	management	3	2026-04-29 18:40:12.20171	2026-04-29 18:40:12.20171	t	\N	2026-04-29 18:40:12.198
12	Koustav 	bcm70165@gmail.com	$2a$10$2V3HAobpg1HtZ957hnrW8.CtT3hU2tXqQx2SuWqxh05Ujx9LKWYTq	npd	3	2026-04-29 18:54:45.308768	2026-04-29 18:54:45.308768	t	9	2026-04-29 18:55:22.70824
11	Bhavana	akshup7227@gmail.com	$2a$10$6lsmboqjT0MPQnF9DLXtzuo6BJPYGt1qDzAc6rmI58zMwBUAy35gW	store_incharge	3	2026-04-29 18:47:44.68249	2026-04-29 18:47:44.68249	t	9	2026-04-29 18:55:26.39447
10	Arya	akshapp17@gmail.com	$2a$10$4QQfsv7ObVJunc/fg8UqjO1VmXeo3IBIeJoEpgOBZXGodi9mnDMa.	accountant	3	2026-04-29 18:44:07.959436	2026-04-29 18:44:07.959436	t	9	2026-04-29 18:55:29.317128
\.


--
-- TOC entry 5504 (class 0 OID 19277)
-- Dependencies: 254
-- Data for Name: vendor_bids; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendor_bids (id, demand_id, vendor_id, total_amount, supply_until_date, notes, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5500 (class 0 OID 19228)
-- Dependencies: 250
-- Data for Name: vendor_demands; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendor_demands (id, title, description, company_id, created_by, status, bid_deadline, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5562 (class 0 OID 0)
-- Dependencies: 275
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attendance_id_seq', 118, true);


--
-- TOC entry 5563 (class 0 OID 0)
-- Dependencies: 269
-- Name: barcodes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.barcodes_id_seq', 16, true);


--
-- TOC entry 5564 (class 0 OID 0)
-- Dependencies: 255
-- Name: bid_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bid_items_id_seq', 1, false);


--
-- TOC entry 5565 (class 0 OID 0)
-- Dependencies: 225
-- Name: bill_of_materials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bill_of_materials_id_seq', 3, true);


--
-- TOC entry 5566 (class 0 OID 0)
-- Dependencies: 219
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.companies_id_seq', 3, true);


--
-- TOC entry 5567 (class 0 OID 0)
-- Dependencies: 251
-- Name: demand_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.demand_items_id_seq', 1, false);


--
-- TOC entry 5568 (class 0 OID 0)
-- Dependencies: 235
-- Name: enquiries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.enquiries_id_seq', 14, true);


--
-- TOC entry 5569 (class 0 OID 0)
-- Dependencies: 229
-- Name: inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventory_id_seq', 28, true);


--
-- TOC entry 5570 (class 0 OID 0)
-- Dependencies: 259
-- Name: major_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.major_orders_id_seq', 1, false);


--
-- TOC entry 5571 (class 0 OID 0)
-- Dependencies: 241
-- Name: master_materials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.master_materials_id_seq', 12, true);


--
-- TOC entry 5572 (class 0 OID 0)
-- Dependencies: 243
-- Name: master_vendors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.master_vendors_id_seq', 5, true);


--
-- TOC entry 5573 (class 0 OID 0)
-- Dependencies: 257
-- Name: materials_detail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.materials_detail_id_seq', 1, false);


--
-- TOC entry 5574 (class 0 OID 0)
-- Dependencies: 263
-- Name: minor_order_bids_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.minor_order_bids_id_seq', 1, false);


--
-- TOC entry 5575 (class 0 OID 0)
-- Dependencies: 261
-- Name: minor_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.minor_orders_id_seq', 1, false);


--
-- TOC entry 5576 (class 0 OID 0)
-- Dependencies: 227
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 93, true);


--
-- TOC entry 5577 (class 0 OID 0)
-- Dependencies: 267
-- Name: order_receipt_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_receipt_items_id_seq', 39, true);


--
-- TOC entry 5578 (class 0 OID 0)
-- Dependencies: 265
-- Name: order_receipts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_receipts_id_seq', 30, true);


--
-- TOC entry 5579 (class 0 OID 0)
-- Dependencies: 231
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_id_seq', 1, false);


--
-- TOC entry 5580 (class 0 OID 0)
-- Dependencies: 233
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 1, true);


--
-- TOC entry 5581 (class 0 OID 0)
-- Dependencies: 223
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.projects_id_seq', 7, true);


--
-- TOC entry 5582 (class 0 OID 0)
-- Dependencies: 247
-- Name: purchase_order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.purchase_order_items_id_seq', 33, true);


--
-- TOC entry 5583 (class 0 OID 0)
-- Dependencies: 245
-- Name: purchase_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.purchase_orders_id_seq', 25, true);


--
-- TOC entry 5584 (class 0 OID 0)
-- Dependencies: 273
-- Name: requirement_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.requirement_items_id_seq', 4, true);


--
-- TOC entry 5585 (class 0 OID 0)
-- Dependencies: 271
-- Name: requirements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.requirements_id_seq', 11, true);


--
-- TOC entry 5586 (class 0 OID 0)
-- Dependencies: 239
-- Name: revision_bom_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.revision_bom_items_id_seq', 1, false);


--
-- TOC entry 5587 (class 0 OID 0)
-- Dependencies: 237
-- Name: revisions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.revisions_id_seq', 1, false);


--
-- TOC entry 5588 (class 0 OID 0)
-- Dependencies: 221
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 12, true);


--
-- TOC entry 5589 (class 0 OID 0)
-- Dependencies: 253
-- Name: vendor_bids_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.vendor_bids_id_seq', 1, false);


--
-- TOC entry 5590 (class 0 OID 0)
-- Dependencies: 249
-- Name: vendor_demands_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.vendor_demands_id_seq', 1, false);


--
-- TOC entry 5253 (class 2606 OID 19705)
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- TOC entry 5236 (class 2606 OID 19635)
-- Name: barcodes barcodes_legacy_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_legacy_unique UNIQUE (order_id, exp_date);


--
-- TOC entry 5238 (class 2606 OID 19602)
-- Name: barcodes barcodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_pkey PRIMARY KEY (id);


--
-- TOC entry 5240 (class 2606 OID 19637)
-- Name: barcodes barcodes_po_item_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_po_item_unique UNIQUE (purchase_order_item_id, exp_date);


--
-- TOC entry 5197 (class 2606 OID 19318)
-- Name: bid_items bid_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bid_items
    ADD CONSTRAINT bid_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5126 (class 2606 OID 18863)
-- Name: bill_of_materials bill_of_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_materials
    ADD CONSTRAINT bill_of_materials_pkey PRIMARY KEY (id);


--
-- TOC entry 5128 (class 2606 OID 18865)
-- Name: bill_of_materials bill_of_materials_project_id_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_materials
    ADD CONSTRAINT bill_of_materials_project_id_serial_number_key UNIQUE (project_id, serial_number);


--
-- TOC entry 5112 (class 2606 OID 18792)
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- TOC entry 5186 (class 2606 OID 19270)
-- Name: demand_items demand_items_demand_id_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_items
    ADD CONSTRAINT demand_items_demand_id_serial_number_key UNIQUE (demand_id, serial_number);


--
-- TOC entry 5188 (class 2606 OID 19268)
-- Name: demand_items demand_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_items
    ADD CONSTRAINT demand_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5149 (class 2606 OID 19802)
-- Name: enquiries enquiries_company_enquiry_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_company_enquiry_number_unique UNIQUE (company_id, enquiry_number);


--
-- TOC entry 5151 (class 2606 OID 18991)
-- Name: enquiries enquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_pkey PRIMARY KEY (id);


--
-- TOC entry 5136 (class 2606 OID 18910)
-- Name: inventory inventory_company_id_item_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_company_id_item_name_key UNIQUE (company_id, item_name);


--
-- TOC entry 5138 (class 2606 OID 18908)
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- TOC entry 5213 (class 2606 OID 19413)
-- Name: major_orders major_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.major_orders
    ADD CONSTRAINT major_orders_pkey PRIMARY KEY (id);


--
-- TOC entry 5169 (class 2606 OID 19104)
-- Name: master_materials master_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_materials
    ADD CONSTRAINT master_materials_pkey PRIMARY KEY (id);


--
-- TOC entry 5172 (class 2606 OID 19118)
-- Name: master_vendors master_vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_vendors
    ADD CONSTRAINT master_vendors_pkey PRIMARY KEY (id);


--
-- TOC entry 5208 (class 2606 OID 19356)
-- Name: materials_detail materials_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_pkey PRIMARY KEY (id);


--
-- TOC entry 5221 (class 2606 OID 19483)
-- Name: minor_order_bids minor_order_bids_minor_order_id_vendor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_order_bids
    ADD CONSTRAINT minor_order_bids_minor_order_id_vendor_id_key UNIQUE (minor_order_id, vendor_id);


--
-- TOC entry 5223 (class 2606 OID 19481)
-- Name: minor_order_bids minor_order_bids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_order_bids
    ADD CONSTRAINT minor_order_bids_pkey PRIMARY KEY (id);


--
-- TOC entry 5217 (class 2606 OID 19450)
-- Name: minor_orders minor_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_orders
    ADD CONSTRAINT minor_orders_pkey PRIMARY KEY (id);


--
-- TOC entry 5133 (class 2606 OID 18887)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5234 (class 2606 OID 19557)
-- Name: order_receipt_items order_receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipt_items
    ADD CONSTRAINT order_receipt_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5229 (class 2606 OID 19518)
-- Name: order_receipts order_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipts
    ADD CONSTRAINT order_receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 5141 (class 2606 OID 18934)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 5145 (class 2606 OID 18966)
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 5147 (class 2606 OID 18968)
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- TOC entry 5122 (class 2606 OID 19804)
-- Name: projects projects_company_po_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_company_po_number_unique UNIQUE (company_id, po_number);


--
-- TOC entry 5124 (class 2606 OID 18835)
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- TOC entry 5179 (class 2606 OID 19167)
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5176 (class 2606 OID 19137)
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- TOC entry 5251 (class 2606 OID 19682)
-- Name: requirement_items requirement_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_items
    ADD CONSTRAINT requirement_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5249 (class 2606 OID 19655)
-- Name: requirements requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_pkey PRIMARY KEY (id);


--
-- TOC entry 5164 (class 2606 OID 19076)
-- Name: revision_bom_items revision_bom_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revision_bom_items
    ADD CONSTRAINT revision_bom_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5166 (class 2606 OID 19078)
-- Name: revision_bom_items revision_bom_items_revision_id_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revision_bom_items
    ADD CONSTRAINT revision_bom_items_revision_id_serial_number_key UNIQUE (revision_id, serial_number);


--
-- TOC entry 5158 (class 2606 OID 19048)
-- Name: revisions revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revisions
    ADD CONSTRAINT revisions_pkey PRIMARY KEY (id);


--
-- TOC entry 5160 (class 2606 OID 19050)
-- Name: revisions revisions_project_id_revision_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revisions
    ADD CONSTRAINT revisions_project_id_revision_number_key UNIQUE (project_id, revision_number);


--
-- TOC entry 5247 (class 2606 OID 19689)
-- Name: barcodes unique_qr_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT unique_qr_number UNIQUE (qr_number);


--
-- TOC entry 5116 (class 2606 OID 18811)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5118 (class 2606 OID 18809)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5193 (class 2606 OID 19295)
-- Name: vendor_bids vendor_bids_demand_id_vendor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_bids
    ADD CONSTRAINT vendor_bids_demand_id_vendor_id_key UNIQUE (demand_id, vendor_id);


--
-- TOC entry 5195 (class 2606 OID 19293)
-- Name: vendor_bids vendor_bids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_bids
    ADD CONSTRAINT vendor_bids_pkey PRIMARY KEY (id);


--
-- TOC entry 5184 (class 2606 OID 19242)
-- Name: vendor_demands vendor_demands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_demands
    ADD CONSTRAINT vendor_demands_pkey PRIMARY KEY (id);


--
-- TOC entry 5254 (class 1259 OID 19716)
-- Name: idx_attendance_company_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_company_date ON public.attendance USING btree (company_id, date);


--
-- TOC entry 5255 (class 1259 OID 19717)
-- Name: idx_attendance_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_user_date ON public.attendance USING btree (user_id, date);


--
-- TOC entry 5241 (class 1259 OID 19622)
-- Name: idx_barcodes_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_barcodes_company_id ON public.barcodes USING btree (company_id);


--
-- TOC entry 5242 (class 1259 OID 19623)
-- Name: idx_barcodes_item_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_barcodes_item_name ON public.barcodes USING btree (item_name);


--
-- TOC entry 5243 (class 1259 OID 19620)
-- Name: idx_barcodes_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_barcodes_order_id ON public.barcodes USING btree (order_id);


--
-- TOC entry 5244 (class 1259 OID 19621)
-- Name: idx_barcodes_purchase_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_barcodes_purchase_order_id ON public.barcodes USING btree (purchase_order_id);


--
-- TOC entry 5245 (class 1259 OID 19633)
-- Name: idx_barcodes_purchase_order_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_barcodes_purchase_order_item_id ON public.barcodes USING btree (purchase_order_item_id);


--
-- TOC entry 5198 (class 1259 OID 19335)
-- Name: idx_bid_items_bid_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bid_items_bid_id ON public.bid_items USING btree (bid_id);


--
-- TOC entry 5199 (class 1259 OID 19336)
-- Name: idx_bid_items_demand_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bid_items_demand_item_id ON public.bid_items USING btree (demand_item_id);


--
-- TOC entry 5129 (class 1259 OID 18871)
-- Name: idx_bom_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_project_id ON public.bill_of_materials USING btree (project_id);


--
-- TOC entry 5189 (class 1259 OID 19332)
-- Name: idx_demand_items_demand_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demand_items_demand_id ON public.demand_items USING btree (demand_id);


--
-- TOC entry 5152 (class 1259 OID 19004)
-- Name: idx_enquiries_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enquiries_company_id ON public.enquiries USING btree (company_id);


--
-- TOC entry 5153 (class 1259 OID 19005)
-- Name: idx_enquiries_enquiry_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enquiries_enquiry_number ON public.enquiries USING btree (enquiry_number);


--
-- TOC entry 5154 (class 1259 OID 19006)
-- Name: idx_enquiries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enquiries_status ON public.enquiries USING btree (status);


--
-- TOC entry 5134 (class 1259 OID 18916)
-- Name: idx_inventory_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_company_id ON public.inventory USING btree (company_id);


--
-- TOC entry 5209 (class 1259 OID 19494)
-- Name: idx_major_orders_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_major_orders_company_id ON public.major_orders USING btree (company_id);


--
-- TOC entry 5210 (class 1259 OID 19496)
-- Name: idx_major_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_major_orders_status ON public.major_orders USING btree (status);


--
-- TOC entry 5211 (class 1259 OID 19495)
-- Name: idx_major_orders_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_major_orders_vendor_id ON public.major_orders USING btree (vendor_id);


--
-- TOC entry 5167 (class 1259 OID 19105)
-- Name: idx_master_materials_business_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_materials_business_name ON public.master_materials USING btree (business_name);


--
-- TOC entry 5170 (class 1259 OID 19119)
-- Name: idx_master_vendors_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_vendors_name ON public.master_vendors USING btree (name);


--
-- TOC entry 5200 (class 1259 OID 19390)
-- Name: idx_materials_detail_bid_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_detail_bid_id ON public.materials_detail USING btree (bid_id);


--
-- TOC entry 5201 (class 1259 OID 19387)
-- Name: idx_materials_detail_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_detail_company_id ON public.materials_detail USING btree (company_id);


--
-- TOC entry 5202 (class 1259 OID 19388)
-- Name: idx_materials_detail_demand_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_detail_demand_id ON public.materials_detail USING btree (demand_id);


--
-- TOC entry 5203 (class 1259 OID 19389)
-- Name: idx_materials_detail_demand_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_detail_demand_item_id ON public.materials_detail USING btree (demand_item_id);


--
-- TOC entry 5204 (class 1259 OID 19392)
-- Name: idx_materials_detail_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_detail_status ON public.materials_detail USING btree (status);


--
-- TOC entry 5205 (class 1259 OID 19393)
-- Name: idx_materials_detail_unique_demand_item; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_materials_detail_unique_demand_item ON public.materials_detail USING btree (demand_item_id) WHERE (demand_item_id IS NOT NULL);


--
-- TOC entry 5206 (class 1259 OID 19391)
-- Name: idx_materials_detail_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_detail_vendor_id ON public.materials_detail USING btree (vendor_id);


--
-- TOC entry 5218 (class 1259 OID 19499)
-- Name: idx_minor_order_bids_minor_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_minor_order_bids_minor_order_id ON public.minor_order_bids USING btree (minor_order_id);


--
-- TOC entry 5219 (class 1259 OID 19500)
-- Name: idx_minor_order_bids_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_minor_order_bids_vendor_id ON public.minor_order_bids USING btree (vendor_id);


--
-- TOC entry 5214 (class 1259 OID 19497)
-- Name: idx_minor_orders_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_minor_orders_company_id ON public.minor_orders USING btree (company_id);


--
-- TOC entry 5215 (class 1259 OID 19498)
-- Name: idx_minor_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_minor_orders_status ON public.minor_orders USING btree (status);


--
-- TOC entry 5130 (class 1259 OID 18894)
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- TOC entry 5131 (class 1259 OID 18893)
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- TOC entry 5230 (class 1259 OID 19572)
-- Name: idx_order_receipt_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_receipt_items_order_id ON public.order_receipt_items USING btree (order_id);


--
-- TOC entry 5231 (class 1259 OID 19585)
-- Name: idx_order_receipt_items_purchase_order_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_receipt_items_purchase_order_item_id ON public.order_receipt_items USING btree (purchase_order_item_id);


--
-- TOC entry 5232 (class 1259 OID 19571)
-- Name: idx_order_receipt_items_receipt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_receipt_items_receipt_id ON public.order_receipt_items USING btree (receipt_id);


--
-- TOC entry 5224 (class 1259 OID 19569)
-- Name: idx_order_receipts_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_receipts_company_id ON public.order_receipts USING btree (company_id);


--
-- TOC entry 5225 (class 1259 OID 19568)
-- Name: idx_order_receipts_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_receipts_order_id ON public.order_receipts USING btree (order_id);


--
-- TOC entry 5226 (class 1259 OID 19579)
-- Name: idx_order_receipts_purchase_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_receipts_purchase_order_id ON public.order_receipts USING btree (purchase_order_id);


--
-- TOC entry 5227 (class 1259 OID 19570)
-- Name: idx_order_receipts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_receipts_status ON public.order_receipts USING btree (status);


--
-- TOC entry 5139 (class 1259 OID 18945)
-- Name: idx_orders_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_company_id ON public.orders USING btree (company_id);


--
-- TOC entry 5142 (class 1259 OID 18974)
-- Name: idx_password_reset_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- TOC entry 5143 (class 1259 OID 18975)
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- TOC entry 5119 (class 1259 OID 18846)
-- Name: idx_projects_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_company_id ON public.projects USING btree (company_id);


--
-- TOC entry 5120 (class 1259 OID 18847)
-- Name: idx_projects_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_created_by ON public.projects USING btree (created_by);


--
-- TOC entry 5177 (class 1259 OID 19175)
-- Name: idx_purchase_order_items_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_order_items_po_id ON public.purchase_order_items USING btree (po_id);


--
-- TOC entry 5173 (class 1259 OID 19173)
-- Name: idx_purchase_orders_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_company_id ON public.purchase_orders USING btree (company_id);


--
-- TOC entry 5174 (class 1259 OID 19174)
-- Name: idx_purchase_orders_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_vendor_id ON public.purchase_orders USING btree (master_vendor_id);


--
-- TOC entry 5161 (class 1259 OID 19086)
-- Name: idx_revision_bom_revision_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revision_bom_revision_id ON public.revision_bom_items USING btree (revision_id);


--
-- TOC entry 5162 (class 1259 OID 19087)
-- Name: idx_revision_bom_serial; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revision_bom_serial ON public.revision_bom_items USING btree (revision_id, serial_number);


--
-- TOC entry 5155 (class 1259 OID 19084)
-- Name: idx_revisions_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revisions_project_id ON public.revisions USING btree (project_id);


--
-- TOC entry 5156 (class 1259 OID 19085)
-- Name: idx_revisions_revision_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revisions_revision_number ON public.revisions USING btree (project_id, revision_number);


--
-- TOC entry 5113 (class 1259 OID 18817)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 5114 (class 1259 OID 18818)
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- TOC entry 5190 (class 1259 OID 19333)
-- Name: idx_vendor_bids_demand_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_bids_demand_id ON public.vendor_bids USING btree (demand_id);


--
-- TOC entry 5191 (class 1259 OID 19334)
-- Name: idx_vendor_bids_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_bids_vendor_id ON public.vendor_bids USING btree (vendor_id);


--
-- TOC entry 5180 (class 1259 OID 19329)
-- Name: idx_vendor_demands_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_demands_company_id ON public.vendor_demands USING btree (company_id);


--
-- TOC entry 5181 (class 1259 OID 19330)
-- Name: idx_vendor_demands_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_demands_created_by ON public.vendor_demands USING btree (created_by);


--
-- TOC entry 5182 (class 1259 OID 19331)
-- Name: idx_vendor_demands_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_demands_status ON public.vendor_demands USING btree (status);


--
-- TOC entry 5320 (class 2606 OID 19711)
-- Name: attendance attendance_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5321 (class 2606 OID 19706)
-- Name: attendance attendance_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5312 (class 2606 OID 19615)
-- Name: barcodes barcodes_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5313 (class 2606 OID 19605)
-- Name: barcodes barcodes_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.major_orders(id) ON DELETE CASCADE;


--
-- TOC entry 5314 (class 2606 OID 19610)
-- Name: barcodes barcodes_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- TOC entry 5315 (class 2606 OID 19628)
-- Name: barcodes barcodes_purchase_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES public.purchase_order_items(id) ON DELETE CASCADE;


--
-- TOC entry 5287 (class 2606 OID 19319)
-- Name: bid_items bid_items_bid_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bid_items
    ADD CONSTRAINT bid_items_bid_id_fkey FOREIGN KEY (bid_id) REFERENCES public.vendor_bids(id) ON DELETE CASCADE;


--
-- TOC entry 5288 (class 2606 OID 19324)
-- Name: bid_items bid_items_demand_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bid_items
    ADD CONSTRAINT bid_items_demand_item_id_fkey FOREIGN KEY (demand_item_id) REFERENCES public.demand_items(id) ON DELETE CASCADE;


--
-- TOC entry 5263 (class 2606 OID 18866)
-- Name: bill_of_materials bill_of_materials_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_materials
    ADD CONSTRAINT bill_of_materials_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5284 (class 2606 OID 19271)
-- Name: demand_items demand_items_demand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_items
    ADD CONSTRAINT demand_items_demand_id_fkey FOREIGN KEY (demand_id) REFERENCES public.vendor_demands(id) ON DELETE CASCADE;


--
-- TOC entry 5270 (class 2606 OID 19007)
-- Name: enquiries enquiries_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- TOC entry 5271 (class 2606 OID 18994)
-- Name: enquiries enquiries_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5272 (class 2606 OID 18999)
-- Name: enquiries enquiries_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5266 (class 2606 OID 18911)
-- Name: inventory inventory_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5295 (class 2606 OID 19414)
-- Name: major_orders major_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.major_orders
    ADD CONSTRAINT major_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5296 (class 2606 OID 19429)
-- Name: major_orders major_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.major_orders
    ADD CONSTRAINT major_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5297 (class 2606 OID 19419)
-- Name: major_orders major_orders_materials_detail_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.major_orders
    ADD CONSTRAINT major_orders_materials_detail_id_fkey FOREIGN KEY (materials_detail_id) REFERENCES public.materials_detail(id) ON DELETE SET NULL;


--
-- TOC entry 5298 (class 2606 OID 19424)
-- Name: major_orders major_orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.major_orders
    ADD CONSTRAINT major_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.users(id);


--
-- TOC entry 5276 (class 2606 OID 19810)
-- Name: master_materials master_materials_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_materials
    ADD CONSTRAINT master_materials_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5277 (class 2606 OID 19805)
-- Name: master_vendors master_vendors_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_vendors
    ADD CONSTRAINT master_vendors_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5289 (class 2606 OID 19372)
-- Name: materials_detail materials_detail_bid_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_bid_id_fkey FOREIGN KEY (bid_id) REFERENCES public.vendor_bids(id) ON DELETE SET NULL;


--
-- TOC entry 5290 (class 2606 OID 19357)
-- Name: materials_detail materials_detail_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5291 (class 2606 OID 19382)
-- Name: materials_detail materials_detail_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5292 (class 2606 OID 19362)
-- Name: materials_detail materials_detail_demand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_demand_id_fkey FOREIGN KEY (demand_id) REFERENCES public.vendor_demands(id) ON DELETE SET NULL;


--
-- TOC entry 5293 (class 2606 OID 19367)
-- Name: materials_detail materials_detail_demand_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_demand_item_id_fkey FOREIGN KEY (demand_item_id) REFERENCES public.demand_items(id) ON DELETE SET NULL;


--
-- TOC entry 5294 (class 2606 OID 19377)
-- Name: materials_detail materials_detail_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5302 (class 2606 OID 19484)
-- Name: minor_order_bids minor_order_bids_minor_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_order_bids
    ADD CONSTRAINT minor_order_bids_minor_order_id_fkey FOREIGN KEY (minor_order_id) REFERENCES public.minor_orders(id) ON DELETE CASCADE;


--
-- TOC entry 5303 (class 2606 OID 19489)
-- Name: minor_order_bids minor_order_bids_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_order_bids
    ADD CONSTRAINT minor_order_bids_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.users(id);


--
-- TOC entry 5299 (class 2606 OID 19451)
-- Name: minor_orders minor_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_orders
    ADD CONSTRAINT minor_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5300 (class 2606 OID 19461)
-- Name: minor_orders minor_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_orders
    ADD CONSTRAINT minor_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5301 (class 2606 OID 19456)
-- Name: minor_orders minor_orders_selected_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_orders
    ADD CONSTRAINT minor_orders_selected_vendor_id_fkey FOREIGN KEY (selected_vendor_id) REFERENCES public.users(id);


--
-- TOC entry 5264 (class 2606 OID 19030)
-- Name: notifications notifications_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5265 (class 2606 OID 18888)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5309 (class 2606 OID 19563)
-- Name: order_receipt_items order_receipt_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipt_items
    ADD CONSTRAINT order_receipt_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.major_orders(id) ON DELETE CASCADE;


--
-- TOC entry 5310 (class 2606 OID 19580)
-- Name: order_receipt_items order_receipt_items_purchase_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipt_items
    ADD CONSTRAINT order_receipt_items_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES public.purchase_order_items(id) ON DELETE CASCADE;


--
-- TOC entry 5311 (class 2606 OID 19558)
-- Name: order_receipt_items order_receipt_items_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipt_items
    ADD CONSTRAINT order_receipt_items_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.order_receipts(id) ON DELETE CASCADE;


--
-- TOC entry 5304 (class 2606 OID 19534)
-- Name: order_receipts order_receipts_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipts
    ADD CONSTRAINT order_receipts_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- TOC entry 5305 (class 2606 OID 19524)
-- Name: order_receipts order_receipts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipts
    ADD CONSTRAINT order_receipts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5306 (class 2606 OID 19519)
-- Name: order_receipts order_receipts_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipts
    ADD CONSTRAINT order_receipts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.major_orders(id) ON DELETE CASCADE;


--
-- TOC entry 5307 (class 2606 OID 19574)
-- Name: order_receipts order_receipts_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipts
    ADD CONSTRAINT order_receipts_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- TOC entry 5308 (class 2606 OID 19529)
-- Name: order_receipts order_receipts_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipts
    ADD CONSTRAINT order_receipts_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- TOC entry 5267 (class 2606 OID 18935)
-- Name: orders orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5268 (class 2606 OID 18940)
-- Name: orders orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5269 (class 2606 OID 18969)
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5258 (class 2606 OID 19014)
-- Name: projects projects_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- TOC entry 5259 (class 2606 OID 18836)
-- Name: projects projects_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5260 (class 2606 OID 18841)
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5261 (class 2606 OID 19020)
-- Name: projects projects_npd_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_npd_user_id_fkey FOREIGN KEY (npd_user_id) REFERENCES public.users(id);


--
-- TOC entry 5262 (class 2606 OID 19025)
-- Name: projects projects_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5281 (class 2606 OID 19168)
-- Name: purchase_order_items purchase_order_items_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- TOC entry 5278 (class 2606 OID 19138)
-- Name: purchase_orders purchase_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5279 (class 2606 OID 19148)
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5280 (class 2606 OID 19143)
-- Name: purchase_orders purchase_orders_master_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_master_vendor_id_fkey FOREIGN KEY (master_vendor_id) REFERENCES public.master_vendors(id);


--
-- TOC entry 5319 (class 2606 OID 19683)
-- Name: requirement_items requirement_items_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_items
    ADD CONSTRAINT requirement_items_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;


--
-- TOC entry 5316 (class 2606 OID 19656)
-- Name: requirements requirements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5317 (class 2606 OID 19666)
-- Name: requirements requirements_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5318 (class 2606 OID 19661)
-- Name: requirements requirements_sent_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_sent_to_fkey FOREIGN KEY (sent_to) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5275 (class 2606 OID 19079)
-- Name: revision_bom_items revision_bom_items_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revision_bom_items
    ADD CONSTRAINT revision_bom_items_revision_id_fkey FOREIGN KEY (revision_id) REFERENCES public.revisions(id) ON DELETE CASCADE;


--
-- TOC entry 5273 (class 2606 OID 19056)
-- Name: revisions revisions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revisions
    ADD CONSTRAINT revisions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5274 (class 2606 OID 19051)
-- Name: revisions revisions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revisions
    ADD CONSTRAINT revisions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5256 (class 2606 OID 18948)
-- Name: users users_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- TOC entry 5257 (class 2606 OID 18812)
-- Name: users users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5285 (class 2606 OID 19296)
-- Name: vendor_bids vendor_bids_demand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_bids
    ADD CONSTRAINT vendor_bids_demand_id_fkey FOREIGN KEY (demand_id) REFERENCES public.vendor_demands(id) ON DELETE CASCADE;


--
-- TOC entry 5286 (class 2606 OID 19301)
-- Name: vendor_bids vendor_bids_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_bids
    ADD CONSTRAINT vendor_bids_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.users(id);


--
-- TOC entry 5282 (class 2606 OID 19243)
-- Name: vendor_demands vendor_demands_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_demands
    ADD CONSTRAINT vendor_demands_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5283 (class 2606 OID 19248)
-- Name: vendor_demands vendor_demands_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_demands
    ADD CONSTRAINT vendor_demands_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


-- Completed on 2026-05-07 21:14:40

--
-- PostgreSQL database dump complete
--

\unrestrict UsqHCYQDadsftDOpZMyhYkzhfkTl9tq5K2VZ2hWVbOQNThHtlkqb7lTsZ212yst


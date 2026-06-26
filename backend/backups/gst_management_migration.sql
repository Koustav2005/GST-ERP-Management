--
-- PostgreSQL database dump
--

\restrict P9PJ5CZ7VasQkTrLFB8DhQMAAAK5Y61PdG8aANQXZVicoiGufTNc1wasm0KhZKE

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

-- Started on 2026-05-27 10:11:29

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
-- TOC entry 5700 (class 0 OID 0)
-- Dependencies: 4
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 284 (class 1259 OID 28176)
-- Name: allocation_inventory_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allocation_inventory_mapping (
    id integer NOT NULL,
    allocation_task_id integer NOT NULL,
    barcode_id integer NOT NULL,
    allocated_quantity numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 283 (class 1259 OID 28175)
-- Name: allocation_inventory_mapping_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.allocation_inventory_mapping_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5701 (class 0 OID 0)
-- Dependencies: 283
-- Name: allocation_inventory_mapping_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.allocation_inventory_mapping_id_seq OWNED BY public.allocation_inventory_mapping.id;


--
-- TOC entry 282 (class 1259 OID 28135)
-- Name: allocation_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allocation_tasks (
    id integer NOT NULL,
    store_request_id integer NOT NULL,
    worker_id integer NOT NULL,
    worker_name character varying(255) NOT NULL,
    allocation_qr_code text NOT NULL,
    qr_number character varying(50) NOT NULL,
    allocated_items jsonb NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    confirmed_at timestamp without time zone,
    confirmed_by integer,
    created_by integer,
    CONSTRAINT allocation_tasks_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- TOC entry 281 (class 1259 OID 28134)
-- Name: allocation_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.allocation_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5702 (class 0 OID 0)
-- Dependencies: 281
-- Name: allocation_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.allocation_tasks_id_seq OWNED BY public.allocation_tasks.id;


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
-- TOC entry 5703 (class 0 OID 0)
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
-- TOC entry 5704 (class 0 OID 0)
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
-- TOC entry 5705 (class 0 OID 0)
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
-- TOC entry 5706 (class 0 OID 0)
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
-- TOC entry 5707 (class 0 OID 0)
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
-- TOC entry 5708 (class 0 OID 0)
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
-- TOC entry 5709 (class 0 OID 0)
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
-- TOC entry 5710 (class 0 OID 0)
-- Dependencies: 229
-- Name: inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_id_seq OWNED BY public.inventory.id;


--
-- TOC entry 296 (class 1259 OID 28348)
-- Name: job_work_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_work_images (
    id integer NOT NULL,
    job_work_id integer,
    file_path text NOT NULL,
    file_name character varying(255) NOT NULL
);


--
-- TOC entry 295 (class 1259 OID 28347)
-- Name: job_work_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.job_work_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5711 (class 0 OID 0)
-- Dependencies: 295
-- Name: job_work_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.job_work_images_id_seq OWNED BY public.job_work_images.id;


--
-- TOC entry 294 (class 1259 OID 28332)
-- Name: job_work_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_work_items (
    id integer NOT NULL,
    job_work_id integer,
    material_name character varying(255) NOT NULL,
    hsn character varying(50),
    quantity numeric(10,2) NOT NULL,
    unit character varying(50) NOT NULL
);


--
-- TOC entry 293 (class 1259 OID 28331)
-- Name: job_work_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.job_work_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5712 (class 0 OID 0)
-- Dependencies: 293
-- Name: job_work_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.job_work_items_id_seq OWNED BY public.job_work_items.id;


--
-- TOC entry 292 (class 1259 OID 28293)
-- Name: job_work_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_work_requests (
    id integer NOT NULL,
    job_id character varying(50) NOT NULL,
    project_id integer,
    company_id integer,
    job_work_type character varying(100) NOT NULL,
    purpose text,
    loaded_vehicle_weight numeric(10,2) NOT NULL,
    unloaded_vehicle_weight numeric(10,2) NOT NULL,
    actual_vehicle_weight numeric(10,2) NOT NULL,
    accountant_id integer,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    challan_file_path text,
    challan_file_name text,
    vendor_email character varying(255),
    status character varying(20) DEFAULT 'pending'::character varying
);


--
-- TOC entry 291 (class 1259 OID 28292)
-- Name: job_work_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.job_work_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5713 (class 0 OID 0)
-- Dependencies: 291
-- Name: job_work_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.job_work_requests_id_seq OWNED BY public.job_work_requests.id;


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
-- TOC entry 5714 (class 0 OID 0)
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
-- TOC entry 5715 (class 0 OID 0)
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
    company_id integer,
    vendor_type character varying(100),
    gst_number character varying(100),
    pan_number character varying(100),
    opening_balance numeric(15,2) DEFAULT 0,
    credit_period character varying(100),
    currency character varying(50) DEFAULT 'INR'::character varying,
    state character varying(100),
    country character varying(100),
    pincode character varying(20),
    bank_name character varying(255),
    account_number character varying(100),
    ifsc_code character varying(50),
    branch_name character varying(255),
    account_holder_name character varying(255),
    upi_id character varying(255)
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
-- TOC entry 5716 (class 0 OID 0)
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
-- TOC entry 5717 (class 0 OID 0)
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
-- TOC entry 5718 (class 0 OID 0)
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
-- TOC entry 5719 (class 0 OID 0)
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
-- TOC entry 5720 (class 0 OID 0)
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
-- TOC entry 5721 (class 0 OID 0)
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
-- TOC entry 5722 (class 0 OID 0)
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
-- TOC entry 5723 (class 0 OID 0)
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
-- TOC entry 5724 (class 0 OID 0)
-- Dependencies: 233
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- TOC entry 290 (class 1259 OID 28264)
-- Name: project_internal_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_internal_reports (
    id integer NOT NULL,
    project_id integer NOT NULL,
    phase_name character varying(50) NOT NULL,
    report_index integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    uploaded_by integer,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 289 (class 1259 OID 28263)
-- Name: project_internal_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_internal_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5725 (class 0 OID 0)
-- Dependencies: 289
-- Name: project_internal_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_internal_reports_id_seq OWNED BY public.project_internal_reports.id;


--
-- TOC entry 288 (class 1259 OID 28240)
-- Name: project_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_status_history (
    id integer NOT NULL,
    project_id integer NOT NULL,
    old_status character varying(50),
    new_status character varying(50) NOT NULL,
    changed_by integer,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    notes text
);


--
-- TOC entry 287 (class 1259 OID 28239)
-- Name: project_status_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_status_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5726 (class 0 OID 0)
-- Dependencies: 287
-- Name: project_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_status_history_id_seq OWNED BY public.project_status_history.id;


--
-- TOC entry 286 (class 1259 OID 28204)
-- Name: project_workers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_workers (
    id integer NOT NULL,
    project_id integer NOT NULL,
    worker_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_by integer
);


--
-- TOC entry 285 (class 1259 OID 28203)
-- Name: project_workers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_workers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5727 (class 0 OID 0)
-- Dependencies: 285
-- Name: project_workers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_workers_id_seq OWNED BY public.project_workers.id;


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
-- TOC entry 5728 (class 0 OID 0)
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
-- TOC entry 5729 (class 0 OID 0)
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
-- TOC entry 5730 (class 0 OID 0)
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
-- TOC entry 5731 (class 0 OID 0)
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
-- TOC entry 5732 (class 0 OID 0)
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
-- TOC entry 5733 (class 0 OID 0)
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
-- TOC entry 5734 (class 0 OID 0)
-- Dependencies: 237
-- Name: revisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.revisions_id_seq OWNED BY public.revisions.id;


--
-- TOC entry 280 (class 1259 OID 28111)
-- Name: store_request_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_request_items (
    id integer NOT NULL,
    request_id integer NOT NULL,
    material_name character varying(255) NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit character varying(50) NOT NULL,
    hsn character varying(50),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fulfilled_quantity numeric(10,2) DEFAULT 0.00,
    allocated_quantity numeric(10,2) DEFAULT 0
);


--
-- TOC entry 279 (class 1259 OID 28110)
-- Name: store_request_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.store_request_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5735 (class 0 OID 0)
-- Dependencies: 279
-- Name: store_request_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.store_request_items_id_seq OWNED BY public.store_request_items.id;


--
-- TOC entry 278 (class 1259 OID 28065)
-- Name: store_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_requests (
    id integer NOT NULL,
    project_id integer NOT NULL,
    project_name character varying(255) NOT NULL,
    project_manager_id integer NOT NULL,
    project_manager_name character varying(255) NOT NULL,
    company_id integer NOT NULL,
    requested_by integer NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    request_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    response_date timestamp without time zone,
    responded_by integer,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    allocated_to_worker_id integer,
    allocated_to_worker_name character varying(255),
    allocated_at timestamp without time zone,
    CONSTRAINT store_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'fulfilled'::character varying, 'partially_allocated'::character varying])::text[])))
);


--
-- TOC entry 277 (class 1259 OID 28064)
-- Name: store_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.store_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5736 (class 0 OID 0)
-- Dependencies: 277
-- Name: store_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.store_requests_id_seq OWNED BY public.store_requests.id;


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
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['management'::character varying, 'accountant'::character varying, 'accounts'::character varying, 'store_incharge'::character varying, 'npd'::character varying, 'project_manager'::character varying, 'worker'::character varying, 'sales_executive'::character varying, 'vendor'::character varying])::text[])))
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
-- TOC entry 5737 (class 0 OID 0)
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
-- TOC entry 5738 (class 0 OID 0)
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
-- TOC entry 5739 (class 0 OID 0)
-- Dependencies: 249
-- Name: vendor_demands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_demands_id_seq OWNED BY public.vendor_demands.id;


--
-- TOC entry 5165 (class 2604 OID 28179)
-- Name: allocation_inventory_mapping id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_inventory_mapping ALTER COLUMN id SET DEFAULT nextval('public.allocation_inventory_mapping_id_seq'::regclass);


--
-- TOC entry 5162 (class 2604 OID 28138)
-- Name: allocation_tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_tasks ALTER COLUMN id SET DEFAULT nextval('public.allocation_tasks_id_seq'::regclass);


--
-- TOC entry 5150 (class 2604 OID 19696)
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- TOC entry 5141 (class 2604 OID 19590)
-- Name: barcodes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcodes ALTER COLUMN id SET DEFAULT nextval('public.barcodes_id_seq'::regclass);


--
-- TOC entry 5112 (class 2604 OID 19310)
-- Name: bid_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bid_items ALTER COLUMN id SET DEFAULT nextval('public.bid_items_id_seq'::regclass);


--
-- TOC entry 5058 (class 2604 OID 18852)
-- Name: bill_of_materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_materials ALTER COLUMN id SET DEFAULT nextval('public.bill_of_materials_id_seq'::regclass);


--
-- TOC entry 5046 (class 2604 OID 18784)
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- TOC entry 5106 (class 2604 OID 19257)
-- Name: demand_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_items ALTER COLUMN id SET DEFAULT nextval('public.demand_items_id_seq'::regclass);


--
-- TOC entry 5076 (class 2604 OID 18980)
-- Name: enquiries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries ALTER COLUMN id SET DEFAULT nextval('public.enquiries_id_seq'::regclass);


--
-- TOC entry 5064 (class 2604 OID 18899)
-- Name: inventory id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory ALTER COLUMN id SET DEFAULT nextval('public.inventory_id_seq'::regclass);


--
-- TOC entry 5177 (class 2604 OID 28351)
-- Name: job_work_images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_work_images ALTER COLUMN id SET DEFAULT nextval('public.job_work_images_id_seq'::regclass);


--
-- TOC entry 5176 (class 2604 OID 28335)
-- Name: job_work_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_work_items ALTER COLUMN id SET DEFAULT nextval('public.job_work_items_id_seq'::regclass);


--
-- TOC entry 5173 (class 2604 OID 28296)
-- Name: job_work_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_work_requests ALTER COLUMN id SET DEFAULT nextval('public.job_work_requests_id_seq'::regclass);


--
-- TOC entry 5118 (class 2604 OID 19398)
-- Name: major_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.major_orders ALTER COLUMN id SET DEFAULT nextval('public.major_orders_id_seq'::regclass);


--
-- TOC entry 5084 (class 2604 OID 19092)
-- Name: master_materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_materials ALTER COLUMN id SET DEFAULT nextval('public.master_materials_id_seq'::regclass);


--
-- TOC entry 5089 (class 2604 OID 19110)
-- Name: master_vendors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_vendors ALTER COLUMN id SET DEFAULT nextval('public.master_vendors_id_seq'::regclass);


--
-- TOC entry 5114 (class 2604 OID 19341)
-- Name: materials_detail id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials_detail ALTER COLUMN id SET DEFAULT nextval('public.materials_detail_id_seq'::regclass);


--
-- TOC entry 5127 (class 2604 OID 19470)
-- Name: minor_order_bids id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_order_bids ALTER COLUMN id SET DEFAULT nextval('public.minor_order_bids_id_seq'::regclass);


--
-- TOC entry 5123 (class 2604 OID 19438)
-- Name: minor_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_orders ALTER COLUMN id SET DEFAULT nextval('public.minor_orders_id_seq'::regclass);


--
-- TOC entry 5060 (class 2604 OID 18876)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 5139 (class 2604 OID 19543)
-- Name: order_receipt_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipt_items ALTER COLUMN id SET DEFAULT nextval('public.order_receipt_items_id_seq'::regclass);


--
-- TOC entry 5131 (class 2604 OID 19505)
-- Name: order_receipts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipts ALTER COLUMN id SET DEFAULT nextval('public.order_receipts_id_seq'::regclass);


--
-- TOC entry 5069 (class 2604 OID 18921)
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- TOC entry 5073 (class 2604 OID 18958)
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- TOC entry 5171 (class 2604 OID 28267)
-- Name: project_internal_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_internal_reports ALTER COLUMN id SET DEFAULT nextval('public.project_internal_reports_id_seq'::regclass);


--
-- TOC entry 5169 (class 2604 OID 28243)
-- Name: project_status_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_status_history ALTER COLUMN id SET DEFAULT nextval('public.project_status_history_id_seq'::regclass);


--
-- TOC entry 5167 (class 2604 OID 28207)
-- Name: project_workers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_workers ALTER COLUMN id SET DEFAULT nextval('public.project_workers_id_seq'::regclass);


--
-- TOC entry 5053 (class 2604 OID 18823)
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- TOC entry 5099 (class 2604 OID 19157)
-- Name: purchase_order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items ALTER COLUMN id SET DEFAULT nextval('public.purchase_order_items_id_seq'::regclass);


--
-- TOC entry 5094 (class 2604 OID 19124)
-- Name: purchase_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.purchase_orders_id_seq'::regclass);


--
-- TOC entry 5148 (class 2604 OID 19675)
-- Name: requirement_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_items ALTER COLUMN id SET DEFAULT nextval('public.requirement_items_id_seq'::regclass);


--
-- TOC entry 5143 (class 2604 OID 19645)
-- Name: requirements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements ALTER COLUMN id SET DEFAULT nextval('public.requirements_id_seq'::regclass);


--
-- TOC entry 5082 (class 2604 OID 19065)
-- Name: revision_bom_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revision_bom_items ALTER COLUMN id SET DEFAULT nextval('public.revision_bom_items_id_seq'::regclass);


--
-- TOC entry 5080 (class 2604 OID 19039)
-- Name: revisions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revisions ALTER COLUMN id SET DEFAULT nextval('public.revisions_id_seq'::regclass);


--
-- TOC entry 5158 (class 2604 OID 28114)
-- Name: store_request_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_request_items ALTER COLUMN id SET DEFAULT nextval('public.store_request_items_id_seq'::regclass);


--
-- TOC entry 5153 (class 2604 OID 28068)
-- Name: store_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_requests ALTER COLUMN id SET DEFAULT nextval('public.store_requests_id_seq'::regclass);


--
-- TOC entry 5049 (class 2604 OID 18797)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5108 (class 2604 OID 19280)
-- Name: vendor_bids id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_bids ALTER COLUMN id SET DEFAULT nextval('public.vendor_bids_id_seq'::regclass);


--
-- TOC entry 5102 (class 2604 OID 19231)
-- Name: vendor_demands id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_demands ALTER COLUMN id SET DEFAULT nextval('public.vendor_demands_id_seq'::regclass);


--
-- TOC entry 5682 (class 0 OID 28176)
-- Dependencies: 284
-- Data for Name: allocation_inventory_mapping; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.allocation_inventory_mapping (id, allocation_task_id, barcode_id, allocated_quantity, created_at) FROM stdin;
1	1	5	2.00	2026-05-23 08:31:39.092486
2	2	5	1.00	2026-05-23 08:32:21.343304
3	4	5	1.00	2026-05-23 10:02:30.673271
4	5	6	1.00	2026-05-23 12:09:42.1432
5	7	17	1.00	2026-05-23 12:14:03.282229
\.


--
-- TOC entry 5680 (class 0 OID 28135)
-- Dependencies: 282
-- Data for Name: allocation_tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.allocation_tasks (id, store_request_id, worker_id, worker_name, allocation_qr_code, qr_number, allocated_items, status, created_at, confirmed_at, confirmed_by, created_by) FROM stdin;
5	6	21	Shivam	{"type":"allocation_task","qr_number":"ALLOC17795182665","id":5,"worker_id":21}	ALLOC17795182665	[{"hsn": "12367", "unit": "units", "qr_code": "QR00000006 ", "exp_date": "2028-11-10T18:30:00.000Z", "mfg_date": "2024-11-11T18:30:00.000Z", "quantity": 1, "material_name": "Ms sheet", "barcode_allocations": [{"quantity": 1, "barcode_id": 6, "barcode_data": "ITEM DETAILS\\nItem Name: Ms sheet\\nHSN: 12367\\nPurchased Date: 2026-03-16\\nManufacturing Date: 2024-11-12\\nExpiry Date: 2028-11-11\\nQuantity: 1\\nBatch Number: N/A\\nMaterial Info: N/A\\n\\nJSON Data: {\\"item_name\\":\\"Ms sheet\\",\\"hsn\\":\\"12367\\",\\"purchased_date\\":\\"2026-03-16\\",\\"mfg_date\\":\\"2024-11-12\\",\\"exp_date\\":\\"2028-11-11\\",\\"quantity\\":1,\\"batch_number\\":null,\\"material_info\\":null}"}]}, {"hsn": "12347", "unit": "ltr", "exp_date": null, "mfg_date": null, "quantity": 1, "material_name": "Trew"}]	confirmed	2026-05-23 12:07:46.534979	2026-05-23 12:09:42.1432	21	4
6	7	20	Deepak	{"type":"allocation_task","qr_number":"ALLOC17795185852","id":6,"worker_id":20}	ALLOC17795185852	[{"hsn": "12367", "unit": "units", "qr_code": "QR00000017", "exp_date": null, "mfg_date": null, "quantity": 1, "material_name": "Ms sheet", "barcode_allocations": [{"quantity": 1, "barcode_id": 17, "barcode_data": "Item: Ms sheet\\nQty: 5\\nDate: 2026-05-22T21:07:24.300Z\\nJSON Data: {\\"item_name\\":\\"Ms sheet\\",\\"hsn\\":\\"12367\\",\\"quantity\\":5,\\"unit\\":\\"\\",\\"company_id\\":\\"1\\",\\"receipt_id\\":31,\\"purchase_order_id\\":\\"26\\"}"}]}]	pending	2026-05-23 12:13:05.245503	\N	\N	4
1	1	20	Deepak	{"type":"allocation_task","qr_number":"ALLOC17795030251","id":1,"worker_id":20}	ALLOC17795030251	[{"hsn": "1234", "unit": "units", "qr_code": "QR00000005 ", "exp_date": "2027-03-15T18:30:00.000Z", "mfg_date": "2026-03-15T18:30:00.000Z", "quantity": 2, "material_name": "TestItem", "barcode_allocations": [{"quantity": 2, "barcode_id": 5, "barcode_data": "ITEM DETAILS\\nJSON Data: {\\"quantity\\": 5}"}]}, {"hsn": "12347", "unit": "ltr", "exp_date": null, "mfg_date": null, "quantity": 2, "material_name": "Trew"}]	confirmed	2026-05-23 07:53:45.144631	2026-05-23 08:31:39.092486	20	4
2	2	20	Deepak	{"type":"allocation_task","qr_number":"ALLOC17795043216","id":2,"worker_id":20}	ALLOC17795043216	[{"hsn": "1234", "unit": "units", "qr_code": "QR00000005 ", "exp_date": "2027-03-15T18:30:00.000Z", "mfg_date": "2026-03-15T18:30:00.000Z", "quantity": 1, "material_name": "TestItem", "barcode_allocations": [{"quantity": 1, "barcode_id": 5, "barcode_data": "ITEM DETAILS\\nJSON Data: {\\"quantity\\": 5}"}]}]	confirmed	2026-05-23 08:15:21.645076	2026-05-23 08:32:21.343304	20	4
4	5	20	Deepak	{"type":"allocation_task","qr_number":"ALLOC17795106384","id":4,"worker_id":20}	ALLOC17795106384	[{"hsn": "1234", "unit": "units", "qr_code": "QR00000005 ", "exp_date": "2027-03-15T18:30:00.000Z", "mfg_date": "2026-03-15T18:30:00.000Z", "quantity": 1, "material_name": "TestItem", "barcode_allocations": [{"quantity": 1, "barcode_id": 5, "barcode_data": "ITEM DETAILS\\nJSON Data: {\\"quantity\\":2}  "}]}]	confirmed	2026-05-23 10:00:38.482067	2026-05-23 10:02:30.673271	20	4
7	8	21	Shivam	{"type":"allocation_task","qr_number":"ALLOC17795186068","id":7,"worker_id":21}	ALLOC17795186068	[{"hsn": "12367", "unit": "units", "qr_code": "QR00000017", "exp_date": null, "mfg_date": null, "quantity": 1, "material_name": "Ms sheet", "barcode_allocations": [{"quantity": 1, "barcode_id": 17, "barcode_data": "Item: Ms sheet\\nQty: 5\\nDate: 2026-05-22T21:07:24.300Z\\nJSON Data: {\\"item_name\\":\\"Ms sheet\\",\\"hsn\\":\\"12367\\",\\"quantity\\":5,\\"unit\\":\\"\\",\\"company_id\\":\\"1\\",\\"receipt_id\\":31,\\"purchase_order_id\\":\\"26\\"}"}]}]	confirmed	2026-05-23 12:13:26.869411	2026-05-23 12:14:03.282229	21	4
\.


--
-- TOC entry 5674 (class 0 OID 19693)
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
119	3	1	2026-05-23 02:08:14.992621	\N	2026-05-23
120	3	1	2026-05-23 02:13:05.817933	2026-05-23 02:15:36.781106	2026-05-23
121	11	3	2026-05-23 02:32:18.362483	2026-05-23 02:32:28.559882	2026-05-23
122	4	1	2026-05-23 02:35:34.255609	\N	2026-05-23
123	3	1	2026-05-23 03:48:30.016695	\N	2026-05-23
124	3	1	2026-05-23 07:11:49.897623	2026-05-23 07:16:26.976375	2026-05-23
125	1	1	2026-05-23 07:23:30.543583	2026-05-23 07:23:34.678903	2026-05-23
126	1	1	2026-05-23 07:24:47.936943	2026-05-23 07:25:05.48724	2026-05-23
128	17	5	2026-05-23 07:28:49.422532	\N	2026-05-23
129	18	5	2026-05-23 07:28:49.630931	\N	2026-05-23
130	19	5	2026-05-23 07:28:49.693886	\N	2026-05-23
127	13	1	2026-05-23 07:25:16.335373	2026-05-23 07:29:14.958496	2026-05-23
131	1	1	2026-05-23 07:30:15.668114	2026-05-23 07:30:28.819355	2026-05-23
132	20	1	2026-05-23 07:30:47.230518	2026-05-23 07:31:01.393696	2026-05-23
133	2	1	2026-05-23 07:31:27.307771	2026-05-23 07:31:54.805842	2026-05-23
135	2	1	2026-05-23 07:34:59.031909	2026-05-23 07:36:10.391679	2026-05-23
136	4	1	2026-05-23 07:36:30.749904	2026-05-23 07:36:45.760515	2026-05-23
137	2	1	2026-05-23 07:37:06.224662	\N	2026-05-23
134	13	1	2026-05-23 07:32:06.668608	2026-05-23 07:43:50.511868	2026-05-23
139	4	1	2026-05-23 07:44:07.024818	\N	2026-05-23
140	4	1	2026-05-23 07:50:40.838078	\N	2026-05-23
141	13	1	2026-05-23 07:58:53.308515	2026-05-23 08:07:09.820057	2026-05-23
142	20	1	2026-05-23 08:07:23.261516	2026-05-23 08:07:27.834185	2026-05-23
143	13	1	2026-05-23 08:07:43.797652	2026-05-23 08:14:55.065639	2026-05-23
144	4	1	2026-05-23 08:15:09.380482	2026-05-23 08:16:09.511021	2026-05-23
145	20	1	2026-05-23 08:16:32.590461	2026-05-23 08:27:39.271728	2026-05-23
146	1	1	2026-05-23 08:28:32.29581	2026-05-23 08:28:44.971404	2026-05-23
147	21	1	2026-05-23 08:29:04.690823	2026-05-23 08:29:18.929353	2026-05-23
138	2	1	2026-05-23 07:38:03.676388	2026-05-23 08:30:51.599875	2026-05-23
149	4	1	2026-05-23 08:31:03.70562	\N	2026-05-23
148	20	1	2026-05-23 08:29:39.737742	2026-05-23 09:02:43.094516	2026-05-23
150	13	1	2026-05-23 09:02:59.081758	\N	2026-05-23
151	13	1	2026-05-23 09:10:18.182079	\N	2026-05-23
152	13	1	2026-05-23 09:11:04.123596	2026-05-23 09:12:08.791846	2026-05-23
153	2	1	2026-05-23 09:12:23.248962	2026-05-23 09:12:36.114137	2026-05-23
154	13	1	2026-05-23 09:23:03.11068	\N	2026-05-23
155	2	1	2026-05-23 09:23:46.964953	\N	2026-05-23
156	2	1	2026-05-23 09:36:06.646403	2026-05-23 09:37:58.722163	2026-05-23
157	13	1	2026-05-23 09:38:09.185185	2026-05-23 09:55:19.224206	2026-05-23
159	3	1	2026-05-23 09:55:44.046125	2026-05-23 09:58:16.605938	2026-05-23
160	13	1	2026-05-23 09:58:30.017712	2026-05-23 10:00:05.999597	2026-05-23
161	4	1	2026-05-23 10:00:16.86735	2026-05-23 10:00:47.201507	2026-05-23
158	2	1	2026-05-23 09:42:35.123339	2026-05-23 10:02:04.656905	2026-05-23
163	4	1	2026-05-23 10:02:18.010522	2026-05-23 10:02:49.162871	2026-05-23
164	13	1	2026-05-23 10:03:18.779736	\N	2026-05-23
162	20	1	2026-05-23 10:00:58.260665	2026-05-23 11:26:39.357456	2026-05-23
165	13	1	2026-05-23 11:26:50.663043	\N	2026-05-23
166	13	1	2026-05-23 11:28:18.675915	2026-05-23 11:30:37.322273	2026-05-23
167	3	1	2026-05-23 11:30:51.918878	\N	2026-05-23
168	3	1	2026-05-23 11:32:36.576163	\N	2026-05-23
169	3	1	2026-05-23 11:34:51.598091	\N	2026-05-23
170	3	1	2026-05-23 11:37:55.647449	2026-05-23 11:48:39.819707	2026-05-23
171	2	1	2026-05-23 11:48:55.283997	2026-05-23 11:50:26.655062	2026-05-23
172	1	1	2026-05-23 11:50:40.787501	2026-05-23 11:51:18.592943	2026-05-23
173	2	1	2026-05-23 11:51:47.78773	2026-05-23 11:52:47.333912	2026-05-23
174	1	1	2026-05-23 11:52:59.749364	2026-05-23 11:53:28.798462	2026-05-23
175	2	1	2026-05-23 11:53:56.007448	2026-05-23 11:57:50.142963	2026-05-23
176	3	1	2026-05-23 11:57:59.452913	2026-05-23 11:59:20.197064	2026-05-23
177	13	1	2026-05-23 11:59:36.217161	\N	2026-05-23
179	13	1	2026-05-23 12:02:54.483269	\N	2026-05-23
180	13	1	2026-05-23 12:04:10.908418	2026-05-23 12:05:24.789744	2026-05-23
178	2	1	2026-05-23 12:01:25.654551	2026-05-23 12:05:33.566071	2026-05-23
182	20	1	2026-05-23 12:05:59.438816	2026-05-23 12:06:14.119831	2026-05-23
183	21	1	2026-05-23 12:06:34.584798	2026-05-23 12:08:11.583711	2026-05-23
184	21	1	2026-05-23 12:08:22.518699	\N	2026-05-23
181	4	1	2026-05-23 12:05:52.901274	2026-05-23 12:10:37.565375	2026-05-23
185	13	1	2026-05-23 12:10:46.966376	2026-05-23 12:11:59.154315	2026-05-23
186	4	1	2026-05-23 12:12:20.185293	2026-05-23 12:22:05.308823	2026-05-23
187	13	1	2026-05-23 12:22:14.625567	2026-05-23 12:22:48.313815	2026-05-23
188	1	1	2026-05-23 12:23:02.64011	2026-05-23 12:23:20.201728	2026-05-23
189	2	1	2026-05-23 12:23:31.309815	2026-05-23 12:24:53.500339	2026-05-23
190	1	1	2026-05-23 12:25:05.398208	2026-05-23 12:26:28.926669	2026-05-23
191	2	1	2026-05-23 12:26:39.84095	2026-05-23 12:26:59.279221	2026-05-23
192	13	1	2026-05-23 12:27:10.5758	\N	2026-05-23
193	13	1	2026-05-23 12:30:18.494204	\N	2026-05-23
194	13	1	2026-05-23 12:58:58.432028	\N	2026-05-23
195	13	1	2026-05-23 13:01:17.952215	2026-05-23 13:02:06.533243	2026-05-23
196	3	1	2026-05-23 13:02:27.561443	2026-05-23 13:12:35.789103	2026-05-23
197	3	1	2026-05-23 13:12:47.327384	2026-05-23 13:15:55.579078	2026-05-23
198	13	1	2026-05-23 13:16:08.64444	\N	2026-05-23
199	13	1	2026-05-23 13:19:42.357814	2026-05-23 13:20:45.570689	2026-05-23
200	3	1	2026-05-23 13:20:55.26398	2026-05-23 13:24:15.874269	2026-05-23
201	4	1	2026-05-23 13:26:04.312179	2026-05-23 13:26:40.257379	2026-05-23
202	21	1	2026-05-23 13:26:55.314705	2026-05-23 13:27:32.486965	2026-05-23
203	13	1	2026-05-23 13:27:45.802725	2026-05-23 13:31:12.967784	2026-05-23
204	2	1	2026-05-23 13:31:27.033838	2026-05-23 13:32:25.364653	2026-05-23
205	2	1	2026-05-23 13:32:43.671956	2026-05-23 13:33:53.895371	2026-05-23
206	13	1	2026-05-23 13:34:06.898862	\N	2026-05-23
\.


--
-- TOC entry 5668 (class 0 OID 19587)
-- Dependencies: 270
-- Data for Name: barcodes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.barcodes (id, order_id, purchase_order_id, company_id, item_name, hsn, purchased_date, mfg_date, exp_date, qr_number, barcode_data, created_at, purchase_order_item_id) FROM stdin;
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
18	\N	26	1	Ms sheet	12367	2026-05-22	\N	\N	QR00000018 	ITEM DETAILS\nItem Name: Ms sheet\nHSN: 12367\nPurchased Date: 2026-05-22\nExpiry: No Expiry\nQuantity: 5\nBatch Number: 2\nNote: N/A\nMaterial Info: N/A\n\nJSON Data: {"item_name":"Ms sheet","hsn":"12367","purchased_date":"2026-05-22","mfg_date":null,"exp_date":null,"has_expiry":false,"quantity":5,"batch_number":"2","note":null,"material_info":null}	2026-05-23 02:37:54.077397	34
5	\N	17	1	TestItem	1234	2026-03-16	2026-03-16	2027-03-16	QR00000005 	ITEM DETAILS\nJSON Data: {"quantity":1}   	2026-03-16 13:04:52.872611	17
6	\N	18	1	Ms sheet	12367	2026-03-16	2024-11-12	2028-11-11	QR00000006 	ITEM DETAILS\nItem Name: Ms sheet\nHSN: 12367\nPurchased Date: 2026-03-16\nManufacturing Date: 2024-11-12\nExpiry Date: 2028-11-11\nQuantity: 0 \nBatch Number: N/A\nMaterial Info: N/A\n\nJSON Data: {"item_name":"Ms sheet","hsn":"12367","purchased_date":"2026-03-16","mfg_date":"2024-11-12","exp_date":"2028-11-11","quantity":0,"batch_number":null,"material_info":null} 	2026-03-16 13:16:38.932908	18
17	\N	26	1	Ms sheet	12367	2026-05-23	\N	\N	QR00000017	Item: Ms sheet\nQty: 5\nDate: 2026-05-22T21:07:24.300Z\nJSON Data: {"item_name":"Ms sheet","hsn":"12367","quantity":4,"unit":"","company_id":"1","receipt_id":31,"purchase_order_id":"26"} 	2026-05-23 02:37:24.285132	\N
\.


--
-- TOC entry 5654 (class 0 OID 19307)
-- Dependencies: 256
-- Data for Name: bid_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bid_items (id, bid_id, demand_item_id, unit_price, total_price, created_at) FROM stdin;
\.


--
-- TOC entry 5624 (class 0 OID 18849)
-- Dependencies: 226
-- Data for Name: bill_of_materials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bill_of_materials (id, project_id, serial_number, material_name, quantity, unit, hsn, notes, created_at, estimated_cost, supplier) FROM stdin;
1	5	\N	Cassette	2.00	units	871493	\N	2026-04-10 12:31:32.940223	\N	\N
2	6	\N	Steel Rod	2.00	nos	234	\N	2026-04-29 19:40:56.487105	\N	\N
3	6	\N	Plastic	5.00	bag	543	\N	2026-04-29 19:40:56.533705	\N	\N
5	2	\N	TestItem	2.00	units	1234	\N	2026-05-23 07:38:30.446083	\N	\N
6	2	\N	Trew	1.00	ltr	12347	\N	2026-05-23 07:49:50.04991	\N	\N
7	1	\N	TestItem	1.00	units	1234	\N	2026-05-23 08:11:50.491873	\N	\N
8	10	\N	Trew	1.00	ltr	12347	\N	2026-05-23 11:57:16.44606	\N	\N
9	10	\N	Ms sheet	1.00	units	12367	\N	2026-05-23 11:57:16.486227	\N	\N
\.


--
-- TOC entry 5618 (class 0 OID 18781)
-- Dependencies: 220
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.companies (id, name, email, gst_number, created_at, updated_at) FROM stdin;
1	Subhash Engineering 	saurabh102@gmail.com	1234567890OYDGG	2026-02-04 01:41:20.152247	2026-02-04 01:41:20.152247
2	Shuhita Engineering	mmt@gmail.com	12SF54356CF7888	2026-04-09 21:57:51.701247	2026-04-09 21:57:51.701247
3	Suhas Engineering 	patilakshata758@gmail.com	\N	2026-04-29 18:40:12.17774	2026-04-29 18:40:12.17774
4	Test Role Company 1779501482267	admin.1779501482267@example.com	27AAAAA1111A1Z1	2026-05-23 07:28:02.410826	2026-05-23 07:28:02.410826
5	Test Role Company 1779501529202	admin.1779501529202@example.com	27AAAAA1111A1Z1	2026-05-23 07:28:49.349173	2026-05-23 07:28:49.349173
\.


--
-- TOC entry 5650 (class 0 OID 19254)
-- Dependencies: 252
-- Data for Name: demand_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.demand_items (id, demand_id, serial_number, item_name, quantity, unit, hsn, notes, created_at) FROM stdin;
\.


--
-- TOC entry 5634 (class 0 OID 18977)
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
15	EN0006	1	1	final_mine.pdf	D:\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\EN0006_final_mine.pdf	accepted_by_customer	\N	2026-05-23 11:51:05.300423	2026-05-23 11:54:27.304423	2	report-1779508965183.pdf	D:\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\QUOT_EN0006_report-1779508965183.pdf	2026-05-23 11:52:38.42861	PO_EN0006_Gmail%20-%20TCS%20NQT%20All%20India%20batch%202026%20_%2021st%20May%202026.PDF	D:\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0006_Gmail%20-%20TCS%20NQT%20All%20India%20batch%202026%20_%2021st%20May%202026.PDF	2026-05-23 11:54:27.263837	\N
16	EN0007	1	1	PO_EN0006_Gmail%2520-%2520TCS%2520NQT%2520All%2520India%2520batch%25202026%2520_%252021st%2520May%25202026.PDF	D:\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\EN0007_PO_EN0006_Gmail%2520-%2520TCS%2520NQT%2520All%2520India%2520batch%25202026%2520_%252021st%2520May%25202026.PDF	accepted_by_customer	\N	2026-05-23 12:23:09.956569	2026-05-23 12:25:34.080944	2	PO_EN0006_Gmail%252520-%252520TCS%252520NQT%252520All%252520India%252520batch%2525202026%252520_%25252021st%252520May%2525202026.PDF	D:\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\QUOT_EN0007_PO_EN0006_Gmail%252520-%252520TCS%252520NQT%252520All%252520India%252520batch%2525202026%252520_%25252021st%252520May%2525202026.PDF	2026-05-23 12:24:46.452028	PO_EN0007_report-1779508965183.pdf	D:\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0007_report-1779508965183.pdf	2026-05-23 12:25:34.050739	\N
\.


--
-- TOC entry 5628 (class 0 OID 18896)
-- Dependencies: 230
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory (id, company_id, item_name, quantity, unit, hsn, last_updated, last_updated_at, created_at) FROM stdin;
19	1	Qwer	2.00		12345	2026-03-16 02:06:11.05926	2026-03-16 12:27:11.128461	2026-03-16 12:27:11.128461
23	2	Chain	10.00	units	87149990	2026-04-10 01:56:22.864402	2026-04-10 02:47:12.518003	2026-04-10 01:56:22.864402
27	2	Wheel set	2.00	units	\N	2026-04-10 02:49:48.202828	2026-04-10 02:49:48.202828	2026-04-10 02:49:48.202828
26	2	Cassette	11.00	units	871493	2026-04-10 01:56:22.864402	2026-04-10 02:49:48.202828	2026-04-10 01:56:22.864402
24	2	Handle	13.00	units	8714	2026-04-10 01:56:22.864402	2026-04-10 02:49:48.202828	2026-04-10 01:56:22.864402
25	2	Rim	16.00	units	871492	2026-04-10 01:56:22.864402	2026-04-10 02:49:48.202828	2026-04-10 01:56:22.864402
28	3	Plastic	5.00	units	543	2026-04-30 19:29:25.751725	2026-04-30 19:29:25.751725	2026-04-30 19:29:25.751725
21	1	TestItem	1.00	units	1234	2026-03-16 13:04:52.881372	2026-05-23 10:02:30.673271	2026-03-16 13:04:52.881372
20	1	Trew	0.00	ltr	12347	2026-03-16 02:10:33.829937	2026-05-23 12:09:42.1432	2026-03-16 12:27:11.128461
22	1	Ms sheet	4.00	units	12367	2026-03-16 13:16:38.940106	2026-05-23 12:14:03.282229	2026-03-16 13:16:38.940106
\.


--
-- TOC entry 5694 (class 0 OID 28348)
-- Dependencies: 296
-- Data for Name: job_work_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_work_images (id, job_work_id, file_path, file_name) FROM stdin;
1	3	/uploads/jobwork-1779521516384-217670922.jpeg	362a393c-054b-4a0c-8b4c-89624c3614c3.jpeg
\.


--
-- TOC entry 5692 (class 0 OID 28332)
-- Dependencies: 294
-- Data for Name: job_work_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_work_items (id, job_work_id, material_name, hsn, quantity, unit) FROM stdin;
3	3	Iron	4566	5.00	pcs
4	4	Ms sheet	1234	5.00	pcs
\.


--
-- TOC entry 5690 (class 0 OID 28293)
-- Dependencies: 292
-- Data for Name: job_work_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_work_requests (id, job_id, project_id, company_id, job_work_type, purpose, loaded_vehicle_weight, unloaded_vehicle_weight, actual_vehicle_weight, accountant_id, created_by, created_at, challan_file_path, challan_file_name, vendor_email, status) FROM stdin;
3	JW-2026-0001	11	1	Laser Cutting	\N	23545.00	12345.00	11200.00	3	13	2026-05-23 13:01:56.759604	\N	\N	\N	pending
4	JW-2026-0002	11	1	Bending	\N	2580.00	123.00	2457.00	3	13	2026-05-23 13:20:40.930331	\N	\N	\N	pending
\.


--
-- TOC entry 5658 (class 0 OID 19395)
-- Dependencies: 260
-- Data for Name: major_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.major_orders (id, company_id, materials_detail_id, vendor_id, item_name, hsn, quantity, unit, unit_price, total_price, status, order_date, expected_delivery_date, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5640 (class 0 OID 19089)
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
-- TOC entry 5642 (class 0 OID 19107)
-- Dependencies: 244
-- Data for Name: master_vendors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.master_vendors (id, name, email, phone_number, address, created_at, updated_at, company_id, vendor_type, gst_number, pan_number, opening_balance, credit_period, currency, state, country, pincode, bank_name, account_number, ifsc_code, branch_name, account_holder_name, upi_id) FROM stdin;
2	Mansa	miapp@gmail.com	1236548970	Vsksmshms	2026-04-09 22:42:48.538861	2026-04-09 22:42:48.538861	2	\N	\N	\N	0.00	\N	INR	\N	\N	\N	\N	\N	\N	\N	\N	\N
3	Raju s	r@gmail.com	3685986883	 Sbsmsj cm	2026-04-09 22:42:48.54239	2026-04-09 22:42:48.54239	2	\N	\N	\N	0.00	\N	INR	\N	\N	\N	\N	\N	\N	\N	\N	\N
4	XYZ	patilakshata758@gmail.com	8660363145	Bengaluru 	2026-04-30 19:12:37.233136	2026-04-30 19:12:46.143414	3	\N	\N	\N	0.00	\N	INR	\N	\N	\N	\N	\N	\N	\N	\N	\N
5	ABC	app@gmail.com	9652354825	Bengaluru 	2026-04-30 19:13:31.262073	2026-04-30 19:13:31.262073	3	\N	\N	\N	0.00	\N	INR	\N	\N	\N	\N	\N	\N	\N	\N	\N
1	Gaurav	gk@gmail.com	8651789625	Fgdfjr6ujey	2026-02-26 01:35:00.558497	2026-05-23 07:12:14.347555	1	Sundry Creditors			0.00		INR									
\.


--
-- TOC entry 5656 (class 0 OID 19338)
-- Dependencies: 258
-- Data for Name: materials_detail; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.materials_detail (id, company_id, demand_id, demand_item_id, bid_id, vendor_id, item_name, quantity, unit, hsn, unit_price, total_price, supply_until_date, vendor_name, vendor_gstin, status, notes, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5662 (class 0 OID 19467)
-- Dependencies: 264
-- Data for Name: minor_order_bids; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.minor_order_bids (id, minor_order_id, vendor_id, unit_price, total_price, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5660 (class 0 OID 19435)
-- Dependencies: 262
-- Data for Name: minor_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.minor_orders (id, company_id, item_name, hsn, quantity, unit, deadline_date, status, selected_vendor_id, selected_bid_id, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5626 (class 0 OID 18873)
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
94	3	Order Fully Received	Order SE000000026 has been fully received and requires your review for pricing/GST.	info	f	2026-05-23 02:37:24.285132	\N
95	1	New Employee Signup	Sanjeev (project_manager) has requested to join your company and needs approval.	employee_signup	f	2026-05-23 07:24:33.591956	\N
96	13	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	f	2026-05-23 07:24:57.590675	\N
97	14	New Employee Signup	John PM (project_manager) has requested to join your company and needs approval.	employee_signup	f	2026-05-23 07:28:02.488883	\N
98	14	New Employee Signup	Bob Worker (worker) has requested to join your company and needs approval.	employee_signup	f	2026-05-23 07:28:02.557832	\N
99	17	New Employee Signup	John PM (project_manager) has requested to join your company and needs approval.	employee_signup	f	2026-05-23 07:28:49.486863	\N
100	17	New Employee Signup	Bob Worker (worker) has requested to join your company and needs approval.	employee_signup	f	2026-05-23 07:28:49.552467	\N
101	18	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	f	2026-05-23 07:28:49.561599	\N
102	19	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	f	2026-05-23 07:28:49.566487	\N
103	1	New Employee Signup	Deepak (worker) has requested to join your company and needs approval.	employee_signup	f	2026-05-23 07:29:56.383683	\N
104	20	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	f	2026-05-23 07:30:23.525093	\N
105	13	Project Assignment Update	You have been assigned to project: PO-EN0001-7598	project_assignment	f	2026-05-23 07:31:45.720195	1
106	13	Project Assignment Update	You have been assigned to project: PO0000000001	project_assignment	f	2026-05-23 07:31:51.138941	2
107	4	New Stock Request	New stock request for project PO0000000001	stock_request	f	2026-05-23 07:42:44.062747	2
108	20	Stock Allocated	Stock allocated for project PO0000000001.Please scan QR to confirm.	allocation	f	2026-05-23 07:53:45.144631	2
109	4	New Stock Request	New stock request for project PO-EN0001-7598	stock_request	f	2026-05-23 08:14:50.377369	1
110	20	Stock Allocated	Stock allocated for project PO-EN0001-7598.Please scan QR to confirm.	allocation	f	2026-05-23 08:15:21.645076	1
111	1	New Employee Signup	Shivam (worker) has requested to join your company and needs approval.	employee_signup	f	2026-05-23 08:28:07.830733	\N
112	21	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	f	2026-05-23 08:28:39.060536	\N
114	13	Materials Collected	Worker Deepak has successfully collected items for project "PO0000000001".	collection	f	2026-05-23 08:31:39.092486	2
115	13	Materials Collected	Worker Deepak has successfully collected items for project "PO-EN0001-7598".	collection	f	2026-05-23 08:32:21.343304	1
116	4	New Stock Request	New stock request for project PO-EN0001-7598	stock_request	f	2026-05-23 09:59:55.075058	1
117	20	Stock Allocated	Stock allocated for project PO-EN0001-7598.Please scan QR to confirm.	allocation	f	2026-05-23 10:00:38.482067	1
118	13	Materials Collected	Worker Deepak has successfully collected items for project "PO-EN0001-7598".	collection	f	2026-05-23 10:02:30.673271	1
119	2	New Enquiry Assigned	Enquiry EN0006 has been assigned to you for review. File: final_mine.pdf	enquiry_assigned	f	2026-05-23 11:51:12.813331	\N
120	1	Quotation Uploaded	A quotation has been uploaded for enquiry EN0006 by NPD user undefined.	quotation_uploaded	f	2026-05-23 11:52:38.431698	\N
121	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0006. 	quotation_review	f	2026-05-23 11:53:19.439056	\N
122	2	Customer Decision Recorded	Customer final decision for enquiry EN0006: rejected by customer. 	customer_decision	f	2026-05-23 11:54:05.658041	\N
123	2	Customer Decision Recorded	Customer final decision for enquiry EN0006: accepted by customer. 	customer_decision	f	2026-05-23 11:54:09.704071	\N
124	2	New Project Created	A new project POEN00060002 has been auto-created for enquiry EN0006 after PO upload.	project_created	f	2026-05-23 11:54:27.277522	10
125	2	Customer Decision Recorded	Customer final decision for enquiry EN0006: accepted by customer. 	customer_decision	f	2026-05-23 11:54:27.30654	\N
126	13	Project Assignment Update	You have been assigned to project: POEN00060002	project_assignment	f	2026-05-23 11:54:47.719409	10
127	4	New Stock Request	New stock request for project POEN00060002	stock_request	f	2026-05-23 12:05:18.504982	10
128	21	Stock Allocated	Stock allocated for project POEN00060002.Please scan QR to confirm.	allocation	f	2026-05-23 12:07:46.534979	10
129	13	Materials Collected	Worker Shivam has successfully collected items for project "POEN00060002".	collection	f	2026-05-23 12:09:42.1432	10
130	4	New Stock Request	New stock request for project POEN00060002	stock_request	f	2026-05-23 12:11:39.903629	10
131	4	New Stock Request	New stock request for project POEN00060002	stock_request	f	2026-05-23 12:11:52.031745	10
132	20	Stock Allocated	Stock allocated for project POEN00060002.Please scan QR to confirm.	allocation	f	2026-05-23 12:13:05.245503	10
133	21	Stock Allocated	Stock allocated for project POEN00060002.Please scan QR to confirm.	allocation	f	2026-05-23 12:13:26.869411	10
134	13	Materials Collected	Worker Shivam has successfully collected items for project "POEN00060002".	collection	f	2026-05-23 12:14:03.282229	10
135	2	New Enquiry Assigned	Enquiry EN0007 has been assigned to you for review. File: PO_EN0006_Gmail%2520-%2520TCS%2520NQT%2520All%2520India%2520batch%25202026%2520_%252021st%2520May%25202026.PDF	enquiry_assigned	f	2026-05-23 12:23:16.032818	\N
136	1	Quotation Uploaded	A quotation has been uploaded for enquiry EN0007 by NPD user undefined.	quotation_uploaded	f	2026-05-23 12:24:46.454073	\N
137	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0007. 	quotation_review	f	2026-05-23 12:25:20.584291	\N
138	2	New Project Created	A new project POEN000760003 has been auto-created for enquiry EN0007 after PO upload.	project_created	f	2026-05-23 12:25:34.062786	11
139	2	Customer Decision Recorded	Customer final decision for enquiry EN0007: accepted by customer. 	customer_decision	f	2026-05-23 12:25:34.085445	\N
140	13	Project Assignment Update	You have been assigned to project: POEN000760003	project_assignment	f	2026-05-23 12:26:51.707665	11
\.


--
-- TOC entry 5666 (class 0 OID 19540)
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
40	31	\N	Ms sheet	12367	5.00	5.00		\N	\N	\N	\N	2026-05-23 02:37:24.285132	34
\.


--
-- TOC entry 5664 (class 0 OID 19502)
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
31	\N	1	/uploads/bills/bill-1779484044124-963043164.jpeg	2026-05-23	\N	\N	pending	4	\N	\N	2026-05-23 02:37:24.285132	2026-05-23 02:37:24.285132	26	\N	\N	\N	kg	complete	5.00
\.


--
-- TOC entry 5630 (class 0 OID 18918)
-- Dependencies: 232
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, company_id, order_type, status, created_by, total_amount, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5632 (class 0 OID 18955)
-- Dependencies: 234
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_tokens (id, user_id, token, expires_at, used, created_at) FROM stdin;
1	1	f879f6ee-ddf0-4889-a788-a07002e166a2	2026-02-05 01:38:29.316	f	2026-02-05 01:23:29.31742
\.


--
-- TOC entry 5688 (class 0 OID 28264)
-- Dependencies: 290
-- Data for Name: project_internal_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_internal_reports (id, project_id, phase_name, report_index, file_name, file_path, uploaded_by, uploaded_at) FROM stdin;
2	1	Welding	1	welding_1.pdf	/uploads/report-1779508953680.pdf	13	2026-05-23 09:32:33.681882
3	1	Inspection	1	inspection_1.pdf	/uploads/report-1779508953687.pdf	13	2026-05-23 09:32:33.689736
4	1	Inspection	2	inspection_2.pdf	/uploads/report-1779508953696.pdf	13	2026-05-23 09:32:33.698433
1	1	Fit Up	1	fitup_new.pdf	/uploads/report-1779508953703.pdf	13	2026-05-23 09:32:33.7053
6	2	Fit Up	1	PO_EN0005_1773340542017-1-1.pdf	/uploads/report-1779508965183.pdf	13	2026-05-23 09:32:45.354175
7	2	Welding	1	GST%2520Management%2520ERP%2520System%2520(1).pdf	/uploads/report-1779509003807.pdf	13	2026-05-23 09:33:24.03441
8	2	Inspection	1	PO_EN0005_1773340542017-1.pdf	/uploads/report-1779509051221.pdf	13	2026-05-23 09:34:11.299386
9	2	Inspection	2	PO_EN0005_1773340542017-1-1.pdf	/uploads/report-1779509055617.pdf	13	2026-05-23 09:34:15.662817
10	10	Fit Up	1	PO_EN0006_Gmail%2520-%2520TCS%2520NQT%2520All%2520India%2520batch%25202026%2520_%252021st%2520May%25202026.PDF	/uploads/report-1779517917645.PDF	13	2026-05-23 12:01:57.655372
11	10	Welding	1	report-1779508965183.pdf	/uploads/report-1779517986016.pdf	13	2026-05-23 12:03:06.072402
12	10	Inspection	1	PO_EN0006_Gmail%2520-%2520TCS%2520NQT%2520All%2520India%2520batch%25202026%2520_%252021st%2520May%25202026.PDF	/uploads/report-1779518022445.PDF	13	2026-05-23 12:03:42.453863
13	10	Inspection	2	PO_EN0006_Gmail%2520-%2520TCS%2520NQT%2520All%2520India%2520batch%25202026%2520_%252021st%2520May%25202026.PDF	/uploads/report-1779518024851.PDF	13	2026-05-23 12:03:44.862895
14	11	Fit Up	1	PO_EN0005_1773340542017-1.pdf	/uploads/report-1779522478311.pdf	13	2026-05-23 13:17:58.475369
\.


--
-- TOC entry 5686 (class 0 OID 28240)
-- Dependencies: 288
-- Data for Name: project_status_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_status_history (id, project_id, old_status, new_status, changed_by, changed_at, notes) FROM stdin;
1	1	Started	Cutting	13	2026-05-23 09:22:33.732211	Test cutting phase update
2	2	\N	Started	13	2026-05-23 09:23:10.305311	Project started by Project Manager
3	2	Started	Cutting	13	2026-05-23 09:23:55.530883	Project moved to Cutting phase
4	2	Cutting	Preparation	13	2026-05-23 09:24:12.413396	Project moved to Preparation phase
5	2	Preparation	Fit Up	13	2026-05-23 09:24:48.250892	Project moved to Fit Up phase
6	2	Fit Up	Welding	13	2026-05-23 09:32:55.792618	Project moved to Welding phase
7	2	Welding	Dressing/Finishing	13	2026-05-23 09:33:30.90717	Project moved to Dressing/Finishing phase
8	2	Dressing/Finishing	Dressing/Finishing	13	2026-05-23 09:33:40.940332	Project moved to Dressing/Finishing phase
9	2	Dressing/Finishing	Inspection	13	2026-05-23 09:33:55.392287	Project moved to Inspection phase
10	2	Inspection	Fabrication	13	2026-05-23 09:34:23.278682	Project moved to Fabrication phase
11	1	Started	Cutting	13	2026-05-23 09:40:08.950132	Transition to Cutting phase
12	1	Fabrication	Completed	13	2026-05-23 09:40:08.965907	Project fully completed!
13	2	Fabrication	Completed	13	2026-05-23 09:40:18.505393	Project moved to Completed phase
14	2	Completed	Completed	13	2026-05-23 09:40:26.422169	Project moved to Completed phase
15	10	\N	Started	13	2026-05-23 12:00:05.446293	Project started by Project Manager
16	10	Started	Cutting	13	2026-05-23 12:01:42.570524	Project moved to Cutting phase
17	10	Cutting	Fit Up	13	2026-05-23 12:01:52.094516	Project moved to Fit Up phase
18	10	Fit Up	Fit Up	13	2026-05-23 12:02:02.696512	Project moved to Fit Up phase
19	10	Fit Up	Welding	13	2026-05-23 12:03:03.063462	Project moved to Welding phase
20	10	Welding	Dressing/Finishing	13	2026-05-23 12:03:11.32064	Project moved to Dressing/Finishing phase
21	10	Dressing/Finishing	Inspection	13	2026-05-23 12:03:38.550473	Project moved to Inspection phase
22	10	Inspection	Fabrication	13	2026-05-23 12:03:51.660084	Project moved to Fabrication phase
23	10	Fabrication	Completed	13	2026-05-23 12:04:32.213816	Project moved to Completed phase
24	11	\N	Started	13	2026-05-23 12:27:33.180249	Project started by Project Manager
26	11	Fabrication	Job Work	13	2026-05-23 13:01:56.759604	Dispatched for Job Work (Laser Cutting) under Job ID JW-2026-0001
27	11	Job Work	Cutting	13	2026-05-23 13:17:17.146037	Project moved to Cutting phase
28	11	Cutting	Preparation	13	2026-05-23 13:17:32.396122	Project moved to Preparation phase
29	11	Preparation	Fit Up	13	2026-05-23 13:17:37.972566	Project moved to Fit Up phase
30	11	Fit Up	Fit Up	13	2026-05-23 13:18:12.758818	Project moved to Fit Up phase
31	11	Fabrication	Job Work	13	2026-05-23 13:20:40.930331	Dispatched for Job Work (Bending) under Job ID JW-2026-0002
32	11	Job Work	Fit Up	13	2026-05-23 13:34:32.044003	Project moved to Fit Up phase
\.


--
-- TOC entry 5684 (class 0 OID 28204)
-- Dependencies: 286
-- Data for Name: project_workers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_workers (id, project_id, worker_id, assigned_at, assigned_by) FROM stdin;
1	2	20	2026-05-23 08:06:48.411149	\N
2	1	20	2026-05-23 08:11:23.4432	\N
5	1	21	2026-05-23 09:59:06.066006	\N
6	10	20	2026-05-23 12:04:58.033062	\N
7	10	21	2026-05-23 12:05:07.14164	\N
8	11	20	2026-05-23 13:16:46.636102	\N
\.


--
-- TOC entry 5622 (class 0 OID 18820)
-- Dependencies: 224
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.projects (id, name, description, company_id, created_by, status, sketch_url, hsn_code, created_at, updated_at, po_number, assigned_to, priority, start_date, end_date, npd_user_id, project_id, po_filename, po_path) FROM stdin;
2	PO0000000001	Auto-created from Enquiry EN0005. PO uploaded by undefined.	1	2	completed	\N	\N	2026-04-09 21:48:06.137921	2026-05-23 07:31:51.135777	PO0000000001	13	medium	\N	\N	2	\N	PO_EN0005_1773340542017-1.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0005_1773340542017-1.pdf
6	POEN00010001	Auto-created from Enquiry EN0001. PO uploaded by undefined.	3	12	in_progress	/uploads/sketch-1777471411876.jpg	\N	2026-04-29 19:21:09.094045	2026-04-29 19:33:32.015576	POEN00010001	12	medium	\N	\N	12	\N	PO_EN0001_CSE_Major%20Project%20Phase-2%20Synopsis.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0001_CSE_Major%20Project%20Phase-2%20Synopsis.pdf
3	POEN00010001	Auto-created from Enquiry EN0001. PO uploaded by undefined.	2	6	pending	\N	\N	2026-04-09 22:26:30.621559	2026-04-09 22:26:30.621559	POEN00010001	6	medium	\N	\N	6	\N	PO_EN0001_145-Conduct%20of%20Intermediate%20Reviews%20and%20entry%20of%20CIE%20Marks.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0001_145-Conduct%20of%20Intermediate%20Reviews%20and%20entry%20of%20CIE%20Marks.pdf
4	POEN000210002	Auto-created from Enquiry EN0002. PO uploaded by undefined.	2	6	pending	/uploads/sketch-1775768833730.jpg	\N	2026-04-10 02:26:52.694951	2026-04-10 02:37:13.798045	POEN000210002	6	medium	\N	\N	6	\N	PO_EN0002_1773340542017.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0002_1773340542017.pdf
7	POEN000210002	Auto-created from Enquiry EN0002. PO uploaded by undefined.	3	12	pending	\N	\N	2026-05-07 19:24:43.679464	2026-05-07 19:27:20.956452	POEN000210002	12	medium	\N	\N	12	\N	PO_EN0002_GST%2520Management%2520ERP%2520System%2520(1).pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0002_GST%2520Management%2520ERP%2520System%2520(1).pdf
5	POEN0003210003	Auto-created from Enquiry EN0003. PO uploaded by undefined.	2	6	pending	/uploads/sketch-1775804524047.jpg	\N	2026-04-10 12:30:16.979583	2026-04-10 12:32:04.270347	POEN0003210003	6	medium	\N	\N	6	\N	PO_EN0003_BCS702-module-3-textbook-8.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0003_BCS702-module-3-textbook-8.pdf
10	POEN00060002	Auto-created from Enquiry EN0006. PO uploaded by undefined.	1	2	completed	/uploads/sketch-1779517579288.jpg	\N	2026-05-23 11:54:27.272172	2026-05-23 11:56:19.376495	POEN00060002	13	medium	\N	\N	2	\N	PO_EN0006_Gmail%20-%20TCS%20NQT%20All%20India%20batch%202026%20_%2021st%20May%202026.PDF	D:\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0006_Gmail%20-%20TCS%20NQT%20All%20India%20batch%202026%20_%2021st%20May%202026.PDF
1	PO-EN0001-7598	Auto-created from Enquiry EN0001. PO uploaded by undefined.	1	2	completed	/uploads/sketch-1770923702103.jpg	\N	2026-02-13 00:01:47.102149	2026-05-23 07:31:45.717273	PO-EN0001-7598	13	medium	\N	\N	2	\N	PO_EN0001_5%20AND%207%20RV.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0001_5%20AND%207%20RV.pdf
11	POEN000760003	Auto-created from Enquiry EN0007. PO uploaded by undefined.	1	1	in_progress	\N	\N	2026-05-23 12:25:34.058186	2026-05-23 12:26:51.703346	POEN000760003	13	medium	\N	\N	2	\N	PO_EN0007_report-1779508965183.pdf	D:\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0007_report-1779508965183.pdf
\.


--
-- TOC entry 5646 (class 0 OID 19154)
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
34	26	Ms sheet	12367	5.00		\N	0.00	2026-05-23 02:13:44.348496	0.00
\.


--
-- TOC entry 5644 (class 0 OID 19121)
-- Dependencies: 246
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchase_orders (id, company_id, master_vendor_id, vendor_name, vendor_email, total_amount, status, created_by, created_at, updated_at, po_number_sequential) FROM stdin;
14	1	1	Gaurav 	gk@gmail.com	1292.50	pending	3	2026-02-28 16:19:51.7289	2026-02-28 16:19:51.7289	2
17	1	1	Gaurav 	gk@gmail.com	0.00	pending	3	2026-03-16 02:02:42.317128	2026-03-16 02:02:42.317128	3
18	1	1	Gaurav 	gk@gmail.com	0.00	pending	3	2026-03-16 13:11:08.51789	2026-03-16 13:11:08.51789	4
19	1	1	Gaurav 	gk@gmail.com	0.00	pending	3	2026-03-16 15:46:03.084026	2026-03-16 15:46:03.084026	5
21	2	2	Mansa	miapp@gmail.com	0.00	pending	7	2026-04-09 23:37:36.047618	2026-04-09 23:37:36.047618	1
23	2	2	Mansa	miapp@gmail.com	0.00	pending	7	2026-04-10 00:37:12.328319	2026-04-10 00:37:12.328319	2
25	3	4	XYZ	patilakshata758@gmail.com	0.00	delivered	10	2026-04-30 19:18:10.997061	2026-04-30 19:26:13.620481	1
26	1	1	Gaurav 	gk@gmail.com	0.00	pending	3	2026-05-23 02:13:44.348496	2026-05-23 02:13:44.348496	6
13	1	1	Gaurav 	gk@gmail.com	2843.50	dispatched	3	2026-02-28 11:53:21.841034	2026-05-23 02:14:09.913521	1
\.


--
-- TOC entry 5672 (class 0 OID 19672)
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
-- TOC entry 5670 (class 0 OID 19642)
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
-- TOC entry 5638 (class 0 OID 19062)
-- Dependencies: 240
-- Data for Name: revision_bom_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.revision_bom_items (id, revision_id, serial_number, material_name, quantity, unit, estimated_cost, supplier, notes, created_at) FROM stdin;
\.


--
-- TOC entry 5636 (class 0 OID 19036)
-- Dependencies: 238
-- Data for Name: revisions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.revisions (id, project_id, revision_number, sketch_url, notes, created_by, created_at) FROM stdin;
\.


--
-- TOC entry 5678 (class 0 OID 28111)
-- Dependencies: 280
-- Data for Name: store_request_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.store_request_items (id, request_id, material_name, quantity, unit, hsn, notes, created_at, fulfilled_quantity, allocated_quantity) FROM stdin;
1	1	TestItem	2.00	units	1234	\N	2026-05-23 07:42:44.060823	0.00	2.00
2	1	Trew	2.00	ltr	12347	\N	2026-05-23 07:42:44.061856	0.00	2.00
3	2	TestItem	1.00	units	1234	\N	2026-05-23 08:14:50.375221	0.00	1.00
5	5	TestItem	1.00	units	1234	\N	2026-05-23 09:59:55.072645	0.00	1.00
6	6	Ms sheet	1.00	units	12367	\N	2026-05-23 12:05:18.501492	0.00	1.00
7	6	Trew	1.00	ltr	12347	\N	2026-05-23 12:05:18.503302	0.00	1.00
8	7	Ms sheet	1.00	units	12367	\N	2026-05-23 12:11:39.900108	0.00	0.00
9	7	Trew	1.00	ltr	12347	\N	2026-05-23 12:11:39.902032	0.00	0.00
11	8	Trew	1.00	ltr	12347	\N	2026-05-23 12:11:52.030078	0.00	0.00
10	8	Ms sheet	1.00	units	12367	\N	2026-05-23 12:11:52.02862	0.00	1.00
\.


--
-- TOC entry 5676 (class 0 OID 28065)
-- Dependencies: 278
-- Data for Name: store_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.store_requests (id, project_id, project_name, project_manager_id, project_manager_name, company_id, requested_by, status, request_date, response_date, responded_by, notes, created_at, updated_at, allocated_to_worker_id, allocated_to_worker_name, allocated_at) FROM stdin;
1	2	PO0000000001	13	Sanjeev	1	13	fulfilled	2026-05-23 07:42:44.058466	\N	\N	\N	2026-05-23 07:42:44.058466	2026-05-23 08:31:39.092486	\N	\N	\N
2	1	PO-EN0001-7598	13	Sanjeev	1	13	fulfilled	2026-05-23 08:14:50.372646	\N	\N	\N	2026-05-23 08:14:50.372646	2026-05-23 08:32:21.343304	20	Deepak	\N
5	1	PO-EN0001-7598	13	Sanjeev	1	13	fulfilled	2026-05-23 09:59:55.070656	\N	\N	\N	2026-05-23 09:59:55.070656	2026-05-23 10:02:30.673271	20	Deepak	\N
6	10	POEN00060002	13	Sanjeev	1	13	fulfilled	2026-05-23 12:05:18.496545	\N	\N	\N	2026-05-23 12:05:18.496545	2026-05-23 12:09:42.1432	21	Shivam	\N
7	10	POEN00060002	13	Sanjeev	1	13	pending	2026-05-23 12:11:39.8944	\N	\N	\N	2026-05-23 12:11:39.8944	2026-05-23 12:11:39.8944	20	Deepak	\N
8	10	POEN00060002	13	Sanjeev	1	13	partially_allocated	2026-05-23 12:11:52.02598	\N	\N	\N	2026-05-23 12:11:52.02598	2026-05-23 12:14:03.282229	21	Shivam	\N
\.


--
-- TOC entry 5620 (class 0 OID 18794)
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
13	Sanjeev	prj@gmail.com	$2a$10$UbBN65TwnU3HnuW7rqgQVeVnWcjZI.AMnuBy6BiSASQjlg4.lsK5S	project_manager	1	2026-05-23 07:24:33.589805	2026-05-23 07:24:33.589805	t	1	2026-05-23 07:24:57.586996
14	Admin User	admin.1779501482267@example.com	$2a$10$8mJE1r4SPIwlEV33txzGjOqZbfdypXPmFrbbhBLQ.4lrgi3uam7lm	management	4	2026-05-23 07:28:02.41366	2026-05-23 07:28:02.41366	t	\N	2026-05-23 07:28:02.411
15	John PM	john.pm.1779501482422@example.com	$2a$10$3dVx0rkkDolRPqNy/8Nfj.2iZ3kjSR3Z8m.PWjALfniVLlEPNIgey	project_manager	4	2026-05-23 07:28:02.487096	2026-05-23 07:28:02.487096	f	\N	\N
16	Bob Worker	bob.worker.1779501482492@example.com	$2a$10$e9vYaAoMWJ1osaUiW4qs6ehGkBzJQ1O13b3LIaC0X2UHmus0cl6Oa	worker	4	2026-05-23 07:28:02.556776	2026-05-23 07:28:02.556776	f	\N	\N
17	Admin User	admin.1779501529202@example.com	$2a$10$itvb0VOolJ3pPmnebGUcEO2oYkIonLJjQRJs9EZF/mF97oLXoLh.a	management	5	2026-05-23 07:28:49.351282	2026-05-23 07:28:49.351282	t	\N	2026-05-23 07:28:49.349
18	John PM	john.pm.1779501529425@example.com	$2a$10$TsLyaQTm8LcnYFRTg1eNwu94m3ksGiTalPEEDN1ushb4G0GG1sYxG	project_manager	5	2026-05-23 07:28:49.485667	2026-05-23 07:28:49.485667	t	17	2026-05-23 07:28:49.55995
19	Bob Worker	bob.worker.1779501529488@example.com	$2a$10$ykFod18R.4GotKJSmk4aLOmIPqLOLW/vdo3pa0E.3TUUKpKZyaaNm	worker	5	2026-05-23 07:28:49.551251	2026-05-23 07:28:49.551251	t	17	2026-05-23 07:28:49.565874
20	Deepak	work@gmail.com	$2a$10$thh2XhNDWxQJeYDMOrOsXuehJl9W5yuGcqCPc4cMsobTkesLeLobO	worker	1	2026-05-23 07:29:56.381324	2026-05-23 07:29:56.381324	t	1	2026-05-23 07:30:23.52217
21	Shivam	work2@gmail.com	$2a$10$Eqt.S8Cguu1Zuj9RHj2gWOU4/gygXT/mkmvad/.Ut3HUbdVJL9XHG	worker	1	2026-05-23 08:28:07.827338	2026-05-23 08:28:07.827338	t	1	2026-05-23 08:28:39.058974
\.


--
-- TOC entry 5652 (class 0 OID 19277)
-- Dependencies: 254
-- Data for Name: vendor_bids; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendor_bids (id, demand_id, vendor_id, total_amount, supply_until_date, notes, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5648 (class 0 OID 19228)
-- Dependencies: 250
-- Data for Name: vendor_demands; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendor_demands (id, title, description, company_id, created_by, status, bid_deadline, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5740 (class 0 OID 0)
-- Dependencies: 283
-- Name: allocation_inventory_mapping_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.allocation_inventory_mapping_id_seq', 5, true);


--
-- TOC entry 5741 (class 0 OID 0)
-- Dependencies: 281
-- Name: allocation_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.allocation_tasks_id_seq', 7, true);


--
-- TOC entry 5742 (class 0 OID 0)
-- Dependencies: 275
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attendance_id_seq', 206, true);


--
-- TOC entry 5743 (class 0 OID 0)
-- Dependencies: 269
-- Name: barcodes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.barcodes_id_seq', 18, true);


--
-- TOC entry 5744 (class 0 OID 0)
-- Dependencies: 255
-- Name: bid_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bid_items_id_seq', 1, false);


--
-- TOC entry 5745 (class 0 OID 0)
-- Dependencies: 225
-- Name: bill_of_materials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bill_of_materials_id_seq', 9, true);


--
-- TOC entry 5746 (class 0 OID 0)
-- Dependencies: 219
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.companies_id_seq', 5, true);


--
-- TOC entry 5747 (class 0 OID 0)
-- Dependencies: 251
-- Name: demand_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.demand_items_id_seq', 1, false);


--
-- TOC entry 5748 (class 0 OID 0)
-- Dependencies: 235
-- Name: enquiries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.enquiries_id_seq', 16, true);


--
-- TOC entry 5749 (class 0 OID 0)
-- Dependencies: 229
-- Name: inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventory_id_seq', 28, true);


--
-- TOC entry 5750 (class 0 OID 0)
-- Dependencies: 295
-- Name: job_work_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.job_work_images_id_seq', 1, true);


--
-- TOC entry 5751 (class 0 OID 0)
-- Dependencies: 293
-- Name: job_work_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.job_work_items_id_seq', 4, true);


--
-- TOC entry 5752 (class 0 OID 0)
-- Dependencies: 291
-- Name: job_work_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.job_work_requests_id_seq', 4, true);


--
-- TOC entry 5753 (class 0 OID 0)
-- Dependencies: 259
-- Name: major_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.major_orders_id_seq', 1, false);


--
-- TOC entry 5754 (class 0 OID 0)
-- Dependencies: 241
-- Name: master_materials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.master_materials_id_seq', 12, true);


--
-- TOC entry 5755 (class 0 OID 0)
-- Dependencies: 243
-- Name: master_vendors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.master_vendors_id_seq', 5, true);


--
-- TOC entry 5756 (class 0 OID 0)
-- Dependencies: 257
-- Name: materials_detail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.materials_detail_id_seq', 1, false);


--
-- TOC entry 5757 (class 0 OID 0)
-- Dependencies: 263
-- Name: minor_order_bids_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.minor_order_bids_id_seq', 1, false);


--
-- TOC entry 5758 (class 0 OID 0)
-- Dependencies: 261
-- Name: minor_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.minor_orders_id_seq', 1, false);


--
-- TOC entry 5759 (class 0 OID 0)
-- Dependencies: 227
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 140, true);


--
-- TOC entry 5760 (class 0 OID 0)
-- Dependencies: 267
-- Name: order_receipt_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_receipt_items_id_seq', 40, true);


--
-- TOC entry 5761 (class 0 OID 0)
-- Dependencies: 265
-- Name: order_receipts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_receipts_id_seq', 31, true);


--
-- TOC entry 5762 (class 0 OID 0)
-- Dependencies: 231
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_id_seq', 1, false);


--
-- TOC entry 5763 (class 0 OID 0)
-- Dependencies: 233
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 1, true);


--
-- TOC entry 5764 (class 0 OID 0)
-- Dependencies: 289
-- Name: project_internal_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.project_internal_reports_id_seq', 14, true);


--
-- TOC entry 5765 (class 0 OID 0)
-- Dependencies: 287
-- Name: project_status_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.project_status_history_id_seq', 32, true);


--
-- TOC entry 5766 (class 0 OID 0)
-- Dependencies: 285
-- Name: project_workers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.project_workers_id_seq', 8, true);


--
-- TOC entry 5767 (class 0 OID 0)
-- Dependencies: 223
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.projects_id_seq', 11, true);


--
-- TOC entry 5768 (class 0 OID 0)
-- Dependencies: 247
-- Name: purchase_order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.purchase_order_items_id_seq', 34, true);


--
-- TOC entry 5769 (class 0 OID 0)
-- Dependencies: 245
-- Name: purchase_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.purchase_orders_id_seq', 26, true);


--
-- TOC entry 5770 (class 0 OID 0)
-- Dependencies: 273
-- Name: requirement_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.requirement_items_id_seq', 4, true);


--
-- TOC entry 5771 (class 0 OID 0)
-- Dependencies: 271
-- Name: requirements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.requirements_id_seq', 11, true);


--
-- TOC entry 5772 (class 0 OID 0)
-- Dependencies: 239
-- Name: revision_bom_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.revision_bom_items_id_seq', 1, false);


--
-- TOC entry 5773 (class 0 OID 0)
-- Dependencies: 237
-- Name: revisions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.revisions_id_seq', 1, false);


--
-- TOC entry 5774 (class 0 OID 0)
-- Dependencies: 279
-- Name: store_request_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.store_request_items_id_seq', 11, true);


--
-- TOC entry 5775 (class 0 OID 0)
-- Dependencies: 277
-- Name: store_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.store_requests_id_seq', 8, true);


--
-- TOC entry 5776 (class 0 OID 0)
-- Dependencies: 221
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 27, true);


--
-- TOC entry 5777 (class 0 OID 0)
-- Dependencies: 253
-- Name: vendor_bids_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.vendor_bids_id_seq', 1, false);


--
-- TOC entry 5778 (class 0 OID 0)
-- Dependencies: 249
-- Name: vendor_demands_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.vendor_demands_id_seq', 1, false);


--
-- TOC entry 5349 (class 2606 OID 28186)
-- Name: allocation_inventory_mapping allocation_inventory_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_inventory_mapping
    ADD CONSTRAINT allocation_inventory_mapping_pkey PRIMARY KEY (id);


--
-- TOC entry 5341 (class 2606 OID 28152)
-- Name: allocation_tasks allocation_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_tasks
    ADD CONSTRAINT allocation_tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 5343 (class 2606 OID 28154)
-- Name: allocation_tasks allocation_tasks_qr_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_tasks
    ADD CONSTRAINT allocation_tasks_qr_number_key UNIQUE (qr_number);


--
-- TOC entry 5332 (class 2606 OID 19705)
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- TOC entry 5315 (class 2606 OID 19635)
-- Name: barcodes barcodes_legacy_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_legacy_unique UNIQUE (order_id, exp_date);


--
-- TOC entry 5317 (class 2606 OID 19602)
-- Name: barcodes barcodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_pkey PRIMARY KEY (id);


--
-- TOC entry 5319 (class 2606 OID 19637)
-- Name: barcodes barcodes_po_item_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_po_item_unique UNIQUE (purchase_order_item_id, exp_date);


--
-- TOC entry 5276 (class 2606 OID 19318)
-- Name: bid_items bid_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bid_items
    ADD CONSTRAINT bid_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5205 (class 2606 OID 18863)
-- Name: bill_of_materials bill_of_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_materials
    ADD CONSTRAINT bill_of_materials_pkey PRIMARY KEY (id);


--
-- TOC entry 5207 (class 2606 OID 18865)
-- Name: bill_of_materials bill_of_materials_project_id_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_materials
    ADD CONSTRAINT bill_of_materials_project_id_serial_number_key UNIQUE (project_id, serial_number);


--
-- TOC entry 5191 (class 2606 OID 18792)
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- TOC entry 5265 (class 2606 OID 19270)
-- Name: demand_items demand_items_demand_id_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_items
    ADD CONSTRAINT demand_items_demand_id_serial_number_key UNIQUE (demand_id, serial_number);


--
-- TOC entry 5267 (class 2606 OID 19268)
-- Name: demand_items demand_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_items
    ADD CONSTRAINT demand_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5228 (class 2606 OID 19802)
-- Name: enquiries enquiries_company_enquiry_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_company_enquiry_number_unique UNIQUE (company_id, enquiry_number);


--
-- TOC entry 5230 (class 2606 OID 18991)
-- Name: enquiries enquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_pkey PRIMARY KEY (id);


--
-- TOC entry 5215 (class 2606 OID 18910)
-- Name: inventory inventory_company_id_item_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_company_id_item_name_key UNIQUE (company_id, item_name);


--
-- TOC entry 5217 (class 2606 OID 18908)
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- TOC entry 5377 (class 2606 OID 28358)
-- Name: job_work_images job_work_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_work_images
    ADD CONSTRAINT job_work_images_pkey PRIMARY KEY (id);


--
-- TOC entry 5374 (class 2606 OID 28341)
-- Name: job_work_items job_work_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_work_items
    ADD CONSTRAINT job_work_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5369 (class 2606 OID 28310)
-- Name: job_work_requests job_work_requests_job_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_work_requests
    ADD CONSTRAINT job_work_requests_job_id_key UNIQUE (job_id);


--
-- TOC entry 5371 (class 2606 OID 28308)
-- Name: job_work_requests job_work_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_work_requests
    ADD CONSTRAINT job_work_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5292 (class 2606 OID 19413)
-- Name: major_orders major_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.major_orders
    ADD CONSTRAINT major_orders_pkey PRIMARY KEY (id);


--
-- TOC entry 5248 (class 2606 OID 19104)
-- Name: master_materials master_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_materials
    ADD CONSTRAINT master_materials_pkey PRIMARY KEY (id);


--
-- TOC entry 5251 (class 2606 OID 19118)
-- Name: master_vendors master_vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_vendors
    ADD CONSTRAINT master_vendors_pkey PRIMARY KEY (id);


--
-- TOC entry 5287 (class 2606 OID 19356)
-- Name: materials_detail materials_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_pkey PRIMARY KEY (id);


--
-- TOC entry 5300 (class 2606 OID 19483)
-- Name: minor_order_bids minor_order_bids_minor_order_id_vendor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_order_bids
    ADD CONSTRAINT minor_order_bids_minor_order_id_vendor_id_key UNIQUE (minor_order_id, vendor_id);


--
-- TOC entry 5302 (class 2606 OID 19481)
-- Name: minor_order_bids minor_order_bids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_order_bids
    ADD CONSTRAINT minor_order_bids_pkey PRIMARY KEY (id);


--
-- TOC entry 5296 (class 2606 OID 19450)
-- Name: minor_orders minor_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_orders
    ADD CONSTRAINT minor_orders_pkey PRIMARY KEY (id);


--
-- TOC entry 5212 (class 2606 OID 18887)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5313 (class 2606 OID 19557)
-- Name: order_receipt_items order_receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipt_items
    ADD CONSTRAINT order_receipt_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5308 (class 2606 OID 19518)
-- Name: order_receipts order_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipts
    ADD CONSTRAINT order_receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 5220 (class 2606 OID 18934)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 5224 (class 2606 OID 18966)
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 5226 (class 2606 OID 18968)
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- TOC entry 5362 (class 2606 OID 28278)
-- Name: project_internal_reports project_internal_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_internal_reports
    ADD CONSTRAINT project_internal_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 5360 (class 2606 OID 28251)
-- Name: project_status_history project_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_status_history
    ADD CONSTRAINT project_status_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5355 (class 2606 OID 28213)
-- Name: project_workers project_workers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_workers
    ADD CONSTRAINT project_workers_pkey PRIMARY KEY (id);


--
-- TOC entry 5357 (class 2606 OID 28215)
-- Name: project_workers project_workers_project_id_worker_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_workers
    ADD CONSTRAINT project_workers_project_id_worker_id_key UNIQUE (project_id, worker_id);


--
-- TOC entry 5201 (class 2606 OID 19804)
-- Name: projects projects_company_po_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_company_po_number_unique UNIQUE (company_id, po_number);


--
-- TOC entry 5203 (class 2606 OID 18835)
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- TOC entry 5258 (class 2606 OID 19167)
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5255 (class 2606 OID 19137)
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- TOC entry 5330 (class 2606 OID 19682)
-- Name: requirement_items requirement_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_items
    ADD CONSTRAINT requirement_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5328 (class 2606 OID 19655)
-- Name: requirements requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_pkey PRIMARY KEY (id);


--
-- TOC entry 5243 (class 2606 OID 19076)
-- Name: revision_bom_items revision_bom_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revision_bom_items
    ADD CONSTRAINT revision_bom_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5245 (class 2606 OID 19078)
-- Name: revision_bom_items revision_bom_items_revision_id_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revision_bom_items
    ADD CONSTRAINT revision_bom_items_revision_id_serial_number_key UNIQUE (revision_id, serial_number);


--
-- TOC entry 5237 (class 2606 OID 19048)
-- Name: revisions revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revisions
    ADD CONSTRAINT revisions_pkey PRIMARY KEY (id);


--
-- TOC entry 5239 (class 2606 OID 19050)
-- Name: revisions revisions_project_id_revision_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revisions
    ADD CONSTRAINT revisions_project_id_revision_number_key UNIQUE (project_id, revision_number);


--
-- TOC entry 5339 (class 2606 OID 28124)
-- Name: store_request_items store_request_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_request_items
    ADD CONSTRAINT store_request_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5337 (class 2606 OID 28084)
-- Name: store_requests store_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_requests
    ADD CONSTRAINT store_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5364 (class 2606 OID 28280)
-- Name: project_internal_reports unique_project_phase_report; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_internal_reports
    ADD CONSTRAINT unique_project_phase_report UNIQUE (project_id, phase_name, report_index);


--
-- TOC entry 5326 (class 2606 OID 19689)
-- Name: barcodes unique_qr_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT unique_qr_number UNIQUE (qr_number);


--
-- TOC entry 5195 (class 2606 OID 18811)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5197 (class 2606 OID 18809)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5272 (class 2606 OID 19295)
-- Name: vendor_bids vendor_bids_demand_id_vendor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_bids
    ADD CONSTRAINT vendor_bids_demand_id_vendor_id_key UNIQUE (demand_id, vendor_id);


--
-- TOC entry 5274 (class 2606 OID 19293)
-- Name: vendor_bids vendor_bids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_bids
    ADD CONSTRAINT vendor_bids_pkey PRIMARY KEY (id);


--
-- TOC entry 5263 (class 2606 OID 19242)
-- Name: vendor_demands vendor_demands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_demands
    ADD CONSTRAINT vendor_demands_pkey PRIMARY KEY (id);


--
-- TOC entry 5350 (class 1259 OID 28202)
-- Name: idx_allocation_inventory_mapping_barcode_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_inventory_mapping_barcode_id ON public.allocation_inventory_mapping USING btree (barcode_id);


--
-- TOC entry 5351 (class 1259 OID 28201)
-- Name: idx_allocation_inventory_mapping_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_inventory_mapping_task_id ON public.allocation_inventory_mapping USING btree (allocation_task_id);


--
-- TOC entry 5344 (class 1259 OID 28200)
-- Name: idx_allocation_tasks_qr_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_tasks_qr_number ON public.allocation_tasks USING btree (qr_number);


--
-- TOC entry 5345 (class 1259 OID 28199)
-- Name: idx_allocation_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_tasks_status ON public.allocation_tasks USING btree (status);


--
-- TOC entry 5346 (class 1259 OID 28198)
-- Name: idx_allocation_tasks_store_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_tasks_store_request_id ON public.allocation_tasks USING btree (store_request_id);


--
-- TOC entry 5347 (class 1259 OID 28197)
-- Name: idx_allocation_tasks_worker_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_tasks_worker_id ON public.allocation_tasks USING btree (worker_id);


--
-- TOC entry 5333 (class 1259 OID 19716)
-- Name: idx_attendance_company_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_company_date ON public.attendance USING btree (company_id, date);


--
-- TOC entry 5334 (class 1259 OID 19717)
-- Name: idx_attendance_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_user_date ON public.attendance USING btree (user_id, date);


--
-- TOC entry 5320 (class 1259 OID 19622)
-- Name: idx_barcodes_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_barcodes_company_id ON public.barcodes USING btree (company_id);


--
-- TOC entry 5321 (class 1259 OID 19623)
-- Name: idx_barcodes_item_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_barcodes_item_name ON public.barcodes USING btree (item_name);


--
-- TOC entry 5322 (class 1259 OID 19620)
-- Name: idx_barcodes_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_barcodes_order_id ON public.barcodes USING btree (order_id);


--
-- TOC entry 5323 (class 1259 OID 19621)
-- Name: idx_barcodes_purchase_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_barcodes_purchase_order_id ON public.barcodes USING btree (purchase_order_id);


--
-- TOC entry 5324 (class 1259 OID 19633)
-- Name: idx_barcodes_purchase_order_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_barcodes_purchase_order_item_id ON public.barcodes USING btree (purchase_order_item_id);


--
-- TOC entry 5277 (class 1259 OID 19335)
-- Name: idx_bid_items_bid_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bid_items_bid_id ON public.bid_items USING btree (bid_id);


--
-- TOC entry 5278 (class 1259 OID 19336)
-- Name: idx_bid_items_demand_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bid_items_demand_item_id ON public.bid_items USING btree (demand_item_id);


--
-- TOC entry 5208 (class 1259 OID 18871)
-- Name: idx_bom_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_project_id ON public.bill_of_materials USING btree (project_id);


--
-- TOC entry 5268 (class 1259 OID 19332)
-- Name: idx_demand_items_demand_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demand_items_demand_id ON public.demand_items USING btree (demand_id);


--
-- TOC entry 5231 (class 1259 OID 19004)
-- Name: idx_enquiries_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enquiries_company_id ON public.enquiries USING btree (company_id);


--
-- TOC entry 5232 (class 1259 OID 19005)
-- Name: idx_enquiries_enquiry_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enquiries_enquiry_number ON public.enquiries USING btree (enquiry_number);


--
-- TOC entry 5233 (class 1259 OID 19006)
-- Name: idx_enquiries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enquiries_status ON public.enquiries USING btree (status);


--
-- TOC entry 5213 (class 1259 OID 18916)
-- Name: idx_inventory_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_company_id ON public.inventory USING btree (company_id);


--
-- TOC entry 5375 (class 1259 OID 28368)
-- Name: idx_job_work_images_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_work_images_request ON public.job_work_images USING btree (job_work_id);


--
-- TOC entry 5372 (class 1259 OID 28367)
-- Name: idx_job_work_items_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_work_items_request ON public.job_work_items USING btree (job_work_id);


--
-- TOC entry 5365 (class 1259 OID 28366)
-- Name: idx_job_work_requests_accountant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_work_requests_accountant ON public.job_work_requests USING btree (accountant_id);


--
-- TOC entry 5366 (class 1259 OID 28365)
-- Name: idx_job_work_requests_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_work_requests_company ON public.job_work_requests USING btree (company_id);


--
-- TOC entry 5367 (class 1259 OID 28364)
-- Name: idx_job_work_requests_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_work_requests_project ON public.job_work_requests USING btree (project_id);


--
-- TOC entry 5288 (class 1259 OID 19494)
-- Name: idx_major_orders_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_major_orders_company_id ON public.major_orders USING btree (company_id);


--
-- TOC entry 5289 (class 1259 OID 19496)
-- Name: idx_major_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_major_orders_status ON public.major_orders USING btree (status);


--
-- TOC entry 5290 (class 1259 OID 19495)
-- Name: idx_major_orders_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_major_orders_vendor_id ON public.major_orders USING btree (vendor_id);


--
-- TOC entry 5246 (class 1259 OID 19105)
-- Name: idx_master_materials_business_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_materials_business_name ON public.master_materials USING btree (business_name);


--
-- TOC entry 5249 (class 1259 OID 19119)
-- Name: idx_master_vendors_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_vendors_name ON public.master_vendors USING btree (name);


--
-- TOC entry 5279 (class 1259 OID 19390)
-- Name: idx_materials_detail_bid_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_detail_bid_id ON public.materials_detail USING btree (bid_id);


--
-- TOC entry 5280 (class 1259 OID 19387)
-- Name: idx_materials_detail_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_detail_company_id ON public.materials_detail USING btree (company_id);


--
-- TOC entry 5281 (class 1259 OID 19388)
-- Name: idx_materials_detail_demand_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_detail_demand_id ON public.materials_detail USING btree (demand_id);


--
-- TOC entry 5282 (class 1259 OID 19389)
-- Name: idx_materials_detail_demand_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_detail_demand_item_id ON public.materials_detail USING btree (demand_item_id);


--
-- TOC entry 5283 (class 1259 OID 19392)
-- Name: idx_materials_detail_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_detail_status ON public.materials_detail USING btree (status);


--
-- TOC entry 5284 (class 1259 OID 19393)
-- Name: idx_materials_detail_unique_demand_item; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_materials_detail_unique_demand_item ON public.materials_detail USING btree (demand_item_id) WHERE (demand_item_id IS NOT NULL);


--
-- TOC entry 5285 (class 1259 OID 19391)
-- Name: idx_materials_detail_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_detail_vendor_id ON public.materials_detail USING btree (vendor_id);


--
-- TOC entry 5297 (class 1259 OID 19499)
-- Name: idx_minor_order_bids_minor_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_minor_order_bids_minor_order_id ON public.minor_order_bids USING btree (minor_order_id);


--
-- TOC entry 5298 (class 1259 OID 19500)
-- Name: idx_minor_order_bids_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_minor_order_bids_vendor_id ON public.minor_order_bids USING btree (vendor_id);


--
-- TOC entry 5293 (class 1259 OID 19497)
-- Name: idx_minor_orders_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_minor_orders_company_id ON public.minor_orders USING btree (company_id);


--
-- TOC entry 5294 (class 1259 OID 19498)
-- Name: idx_minor_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_minor_orders_status ON public.minor_orders USING btree (status);


--
-- TOC entry 5209 (class 1259 OID 18894)
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- TOC entry 5210 (class 1259 OID 18893)
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- TOC entry 5309 (class 1259 OID 19572)
-- Name: idx_order_receipt_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_receipt_items_order_id ON public.order_receipt_items USING btree (order_id);


--
-- TOC entry 5310 (class 1259 OID 19585)
-- Name: idx_order_receipt_items_purchase_order_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_receipt_items_purchase_order_item_id ON public.order_receipt_items USING btree (purchase_order_item_id);


--
-- TOC entry 5311 (class 1259 OID 19571)
-- Name: idx_order_receipt_items_receipt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_receipt_items_receipt_id ON public.order_receipt_items USING btree (receipt_id);


--
-- TOC entry 5303 (class 1259 OID 19569)
-- Name: idx_order_receipts_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_receipts_company_id ON public.order_receipts USING btree (company_id);


--
-- TOC entry 5304 (class 1259 OID 19568)
-- Name: idx_order_receipts_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_receipts_order_id ON public.order_receipts USING btree (order_id);


--
-- TOC entry 5305 (class 1259 OID 19579)
-- Name: idx_order_receipts_purchase_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_receipts_purchase_order_id ON public.order_receipts USING btree (purchase_order_id);


--
-- TOC entry 5306 (class 1259 OID 19570)
-- Name: idx_order_receipts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_receipts_status ON public.order_receipts USING btree (status);


--
-- TOC entry 5218 (class 1259 OID 18945)
-- Name: idx_orders_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_company_id ON public.orders USING btree (company_id);


--
-- TOC entry 5221 (class 1259 OID 18974)
-- Name: idx_password_reset_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- TOC entry 5222 (class 1259 OID 18975)
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- TOC entry 5352 (class 1259 OID 28231)
-- Name: idx_project_workers_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_workers_project_id ON public.project_workers USING btree (project_id);


--
-- TOC entry 5353 (class 1259 OID 28232)
-- Name: idx_project_workers_worker_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_workers_worker_id ON public.project_workers USING btree (worker_id);


--
-- TOC entry 5198 (class 1259 OID 18846)
-- Name: idx_projects_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_company_id ON public.projects USING btree (company_id);


--
-- TOC entry 5199 (class 1259 OID 18847)
-- Name: idx_projects_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_created_by ON public.projects USING btree (created_by);


--
-- TOC entry 5256 (class 1259 OID 19175)
-- Name: idx_purchase_order_items_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_order_items_po_id ON public.purchase_order_items USING btree (po_id);


--
-- TOC entry 5252 (class 1259 OID 19173)
-- Name: idx_purchase_orders_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_company_id ON public.purchase_orders USING btree (company_id);


--
-- TOC entry 5253 (class 1259 OID 19174)
-- Name: idx_purchase_orders_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_vendor_id ON public.purchase_orders USING btree (master_vendor_id);


--
-- TOC entry 5240 (class 1259 OID 19086)
-- Name: idx_revision_bom_revision_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revision_bom_revision_id ON public.revision_bom_items USING btree (revision_id);


--
-- TOC entry 5241 (class 1259 OID 19087)
-- Name: idx_revision_bom_serial; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revision_bom_serial ON public.revision_bom_items USING btree (revision_id, serial_number);


--
-- TOC entry 5234 (class 1259 OID 19084)
-- Name: idx_revisions_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revisions_project_id ON public.revisions USING btree (project_id);


--
-- TOC entry 5235 (class 1259 OID 19085)
-- Name: idx_revisions_revision_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revisions_revision_number ON public.revisions USING btree (project_id, revision_number);


--
-- TOC entry 5358 (class 1259 OID 28262)
-- Name: idx_status_history_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_status_history_project_id ON public.project_status_history USING btree (project_id);


--
-- TOC entry 5335 (class 1259 OID 28238)
-- Name: idx_store_requests_allocated_to_worker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_requests_allocated_to_worker ON public.store_requests USING btree (allocated_to_worker_id);


--
-- TOC entry 5192 (class 1259 OID 18817)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 5193 (class 1259 OID 18818)
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- TOC entry 5269 (class 1259 OID 19333)
-- Name: idx_vendor_bids_demand_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_bids_demand_id ON public.vendor_bids USING btree (demand_id);


--
-- TOC entry 5270 (class 1259 OID 19334)
-- Name: idx_vendor_bids_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_bids_vendor_id ON public.vendor_bids USING btree (vendor_id);


--
-- TOC entry 5259 (class 1259 OID 19329)
-- Name: idx_vendor_demands_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_demands_company_id ON public.vendor_demands USING btree (company_id);


--
-- TOC entry 5260 (class 1259 OID 19330)
-- Name: idx_vendor_demands_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_demands_created_by ON public.vendor_demands USING btree (created_by);


--
-- TOC entry 5261 (class 1259 OID 19331)
-- Name: idx_vendor_demands_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_demands_status ON public.vendor_demands USING btree (status);


--
-- TOC entry 5455 (class 2606 OID 28187)
-- Name: allocation_inventory_mapping allocation_inventory_mapping_allocation_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_inventory_mapping
    ADD CONSTRAINT allocation_inventory_mapping_allocation_task_id_fkey FOREIGN KEY (allocation_task_id) REFERENCES public.allocation_tasks(id) ON DELETE CASCADE;


--
-- TOC entry 5456 (class 2606 OID 28192)
-- Name: allocation_inventory_mapping allocation_inventory_mapping_barcode_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_inventory_mapping
    ADD CONSTRAINT allocation_inventory_mapping_barcode_id_fkey FOREIGN KEY (barcode_id) REFERENCES public.barcodes(id) ON DELETE CASCADE;


--
-- TOC entry 5451 (class 2606 OID 28165)
-- Name: allocation_tasks allocation_tasks_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_tasks
    ADD CONSTRAINT allocation_tasks_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.users(id);


--
-- TOC entry 5452 (class 2606 OID 28170)
-- Name: allocation_tasks allocation_tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_tasks
    ADD CONSTRAINT allocation_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5453 (class 2606 OID 28155)
-- Name: allocation_tasks allocation_tasks_store_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_tasks
    ADD CONSTRAINT allocation_tasks_store_request_id_fkey FOREIGN KEY (store_request_id) REFERENCES public.store_requests(id) ON DELETE CASCADE;


--
-- TOC entry 5454 (class 2606 OID 28160)
-- Name: allocation_tasks allocation_tasks_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_tasks
    ADD CONSTRAINT allocation_tasks_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.users(id);


--
-- TOC entry 5442 (class 2606 OID 19711)
-- Name: attendance attendance_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5443 (class 2606 OID 19706)
-- Name: attendance attendance_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5434 (class 2606 OID 19615)
-- Name: barcodes barcodes_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5435 (class 2606 OID 19605)
-- Name: barcodes barcodes_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.major_orders(id) ON DELETE CASCADE;


--
-- TOC entry 5436 (class 2606 OID 19610)
-- Name: barcodes barcodes_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- TOC entry 5437 (class 2606 OID 19628)
-- Name: barcodes barcodes_purchase_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES public.purchase_order_items(id) ON DELETE CASCADE;


--
-- TOC entry 5409 (class 2606 OID 19319)
-- Name: bid_items bid_items_bid_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bid_items
    ADD CONSTRAINT bid_items_bid_id_fkey FOREIGN KEY (bid_id) REFERENCES public.vendor_bids(id) ON DELETE CASCADE;


--
-- TOC entry 5410 (class 2606 OID 19324)
-- Name: bid_items bid_items_demand_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bid_items
    ADD CONSTRAINT bid_items_demand_item_id_fkey FOREIGN KEY (demand_item_id) REFERENCES public.demand_items(id) ON DELETE CASCADE;


--
-- TOC entry 5385 (class 2606 OID 18866)
-- Name: bill_of_materials bill_of_materials_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_materials
    ADD CONSTRAINT bill_of_materials_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5406 (class 2606 OID 19271)
-- Name: demand_items demand_items_demand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_items
    ADD CONSTRAINT demand_items_demand_id_fkey FOREIGN KEY (demand_id) REFERENCES public.vendor_demands(id) ON DELETE CASCADE;


--
-- TOC entry 5392 (class 2606 OID 19007)
-- Name: enquiries enquiries_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- TOC entry 5393 (class 2606 OID 18994)
-- Name: enquiries enquiries_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5394 (class 2606 OID 18999)
-- Name: enquiries enquiries_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5388 (class 2606 OID 18911)
-- Name: inventory inventory_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5469 (class 2606 OID 28359)
-- Name: job_work_images job_work_images_job_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_work_images
    ADD CONSTRAINT job_work_images_job_work_id_fkey FOREIGN KEY (job_work_id) REFERENCES public.job_work_requests(id) ON DELETE CASCADE;


--
-- TOC entry 5468 (class 2606 OID 28342)
-- Name: job_work_items job_work_items_job_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_work_items
    ADD CONSTRAINT job_work_items_job_work_id_fkey FOREIGN KEY (job_work_id) REFERENCES public.job_work_requests(id) ON DELETE CASCADE;


--
-- TOC entry 5464 (class 2606 OID 28321)
-- Name: job_work_requests job_work_requests_accountant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_work_requests
    ADD CONSTRAINT job_work_requests_accountant_id_fkey FOREIGN KEY (accountant_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5465 (class 2606 OID 28316)
-- Name: job_work_requests job_work_requests_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_work_requests
    ADD CONSTRAINT job_work_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5466 (class 2606 OID 28326)
-- Name: job_work_requests job_work_requests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_work_requests
    ADD CONSTRAINT job_work_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5467 (class 2606 OID 28311)
-- Name: job_work_requests job_work_requests_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_work_requests
    ADD CONSTRAINT job_work_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5417 (class 2606 OID 19414)
-- Name: major_orders major_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.major_orders
    ADD CONSTRAINT major_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5418 (class 2606 OID 19429)
-- Name: major_orders major_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.major_orders
    ADD CONSTRAINT major_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5419 (class 2606 OID 19419)
-- Name: major_orders major_orders_materials_detail_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.major_orders
    ADD CONSTRAINT major_orders_materials_detail_id_fkey FOREIGN KEY (materials_detail_id) REFERENCES public.materials_detail(id) ON DELETE SET NULL;


--
-- TOC entry 5420 (class 2606 OID 19424)
-- Name: major_orders major_orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.major_orders
    ADD CONSTRAINT major_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.users(id);


--
-- TOC entry 5398 (class 2606 OID 19810)
-- Name: master_materials master_materials_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_materials
    ADD CONSTRAINT master_materials_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5399 (class 2606 OID 19805)
-- Name: master_vendors master_vendors_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_vendors
    ADD CONSTRAINT master_vendors_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5411 (class 2606 OID 19372)
-- Name: materials_detail materials_detail_bid_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_bid_id_fkey FOREIGN KEY (bid_id) REFERENCES public.vendor_bids(id) ON DELETE SET NULL;


--
-- TOC entry 5412 (class 2606 OID 19357)
-- Name: materials_detail materials_detail_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5413 (class 2606 OID 19382)
-- Name: materials_detail materials_detail_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5414 (class 2606 OID 19362)
-- Name: materials_detail materials_detail_demand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_demand_id_fkey FOREIGN KEY (demand_id) REFERENCES public.vendor_demands(id) ON DELETE SET NULL;


--
-- TOC entry 5415 (class 2606 OID 19367)
-- Name: materials_detail materials_detail_demand_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_demand_item_id_fkey FOREIGN KEY (demand_item_id) REFERENCES public.demand_items(id) ON DELETE SET NULL;


--
-- TOC entry 5416 (class 2606 OID 19377)
-- Name: materials_detail materials_detail_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5424 (class 2606 OID 19484)
-- Name: minor_order_bids minor_order_bids_minor_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_order_bids
    ADD CONSTRAINT minor_order_bids_minor_order_id_fkey FOREIGN KEY (minor_order_id) REFERENCES public.minor_orders(id) ON DELETE CASCADE;


--
-- TOC entry 5425 (class 2606 OID 19489)
-- Name: minor_order_bids minor_order_bids_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_order_bids
    ADD CONSTRAINT minor_order_bids_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.users(id);


--
-- TOC entry 5421 (class 2606 OID 19451)
-- Name: minor_orders minor_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_orders
    ADD CONSTRAINT minor_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5422 (class 2606 OID 19461)
-- Name: minor_orders minor_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_orders
    ADD CONSTRAINT minor_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5423 (class 2606 OID 19456)
-- Name: minor_orders minor_orders_selected_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minor_orders
    ADD CONSTRAINT minor_orders_selected_vendor_id_fkey FOREIGN KEY (selected_vendor_id) REFERENCES public.users(id);


--
-- TOC entry 5386 (class 2606 OID 19030)
-- Name: notifications notifications_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5387 (class 2606 OID 18888)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5431 (class 2606 OID 19563)
-- Name: order_receipt_items order_receipt_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipt_items
    ADD CONSTRAINT order_receipt_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.major_orders(id) ON DELETE CASCADE;


--
-- TOC entry 5432 (class 2606 OID 19580)
-- Name: order_receipt_items order_receipt_items_purchase_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipt_items
    ADD CONSTRAINT order_receipt_items_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES public.purchase_order_items(id) ON DELETE CASCADE;


--
-- TOC entry 5433 (class 2606 OID 19558)
-- Name: order_receipt_items order_receipt_items_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipt_items
    ADD CONSTRAINT order_receipt_items_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.order_receipts(id) ON DELETE CASCADE;


--
-- TOC entry 5426 (class 2606 OID 19534)
-- Name: order_receipts order_receipts_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipts
    ADD CONSTRAINT order_receipts_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- TOC entry 5427 (class 2606 OID 19524)
-- Name: order_receipts order_receipts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipts
    ADD CONSTRAINT order_receipts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5428 (class 2606 OID 19519)
-- Name: order_receipts order_receipts_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipts
    ADD CONSTRAINT order_receipts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.major_orders(id) ON DELETE CASCADE;


--
-- TOC entry 5429 (class 2606 OID 19574)
-- Name: order_receipts order_receipts_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipts
    ADD CONSTRAINT order_receipts_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- TOC entry 5430 (class 2606 OID 19529)
-- Name: order_receipts order_receipts_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_receipts
    ADD CONSTRAINT order_receipts_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- TOC entry 5389 (class 2606 OID 18935)
-- Name: orders orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5390 (class 2606 OID 18940)
-- Name: orders orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5391 (class 2606 OID 18969)
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5462 (class 2606 OID 28281)
-- Name: project_internal_reports project_internal_reports_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_internal_reports
    ADD CONSTRAINT project_internal_reports_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5463 (class 2606 OID 28286)
-- Name: project_internal_reports project_internal_reports_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_internal_reports
    ADD CONSTRAINT project_internal_reports_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- TOC entry 5460 (class 2606 OID 28257)
-- Name: project_status_history project_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_status_history
    ADD CONSTRAINT project_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- TOC entry 5461 (class 2606 OID 28252)
-- Name: project_status_history project_status_history_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_status_history
    ADD CONSTRAINT project_status_history_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5457 (class 2606 OID 28226)
-- Name: project_workers project_workers_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_workers
    ADD CONSTRAINT project_workers_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- TOC entry 5458 (class 2606 OID 28216)
-- Name: project_workers project_workers_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_workers
    ADD CONSTRAINT project_workers_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5459 (class 2606 OID 28221)
-- Name: project_workers project_workers_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_workers
    ADD CONSTRAINT project_workers_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5380 (class 2606 OID 19014)
-- Name: projects projects_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- TOC entry 5381 (class 2606 OID 18836)
-- Name: projects projects_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5382 (class 2606 OID 18841)
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5383 (class 2606 OID 19020)
-- Name: projects projects_npd_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_npd_user_id_fkey FOREIGN KEY (npd_user_id) REFERENCES public.users(id);


--
-- TOC entry 5384 (class 2606 OID 19025)
-- Name: projects projects_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5403 (class 2606 OID 19168)
-- Name: purchase_order_items purchase_order_items_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- TOC entry 5400 (class 2606 OID 19138)
-- Name: purchase_orders purchase_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5401 (class 2606 OID 19148)
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5402 (class 2606 OID 19143)
-- Name: purchase_orders purchase_orders_master_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_master_vendor_id_fkey FOREIGN KEY (master_vendor_id) REFERENCES public.master_vendors(id);


--
-- TOC entry 5441 (class 2606 OID 19683)
-- Name: requirement_items requirement_items_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_items
    ADD CONSTRAINT requirement_items_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;


--
-- TOC entry 5438 (class 2606 OID 19656)
-- Name: requirements requirements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5439 (class 2606 OID 19666)
-- Name: requirements requirements_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5440 (class 2606 OID 19661)
-- Name: requirements requirements_sent_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_sent_to_fkey FOREIGN KEY (sent_to) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5397 (class 2606 OID 19079)
-- Name: revision_bom_items revision_bom_items_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revision_bom_items
    ADD CONSTRAINT revision_bom_items_revision_id_fkey FOREIGN KEY (revision_id) REFERENCES public.revisions(id) ON DELETE CASCADE;


--
-- TOC entry 5395 (class 2606 OID 19056)
-- Name: revisions revisions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revisions
    ADD CONSTRAINT revisions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5396 (class 2606 OID 19051)
-- Name: revisions revisions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revisions
    ADD CONSTRAINT revisions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5450 (class 2606 OID 28125)
-- Name: store_request_items store_request_items_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_request_items
    ADD CONSTRAINT store_request_items_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.store_requests(id) ON DELETE CASCADE;


--
-- TOC entry 5444 (class 2606 OID 28233)
-- Name: store_requests store_requests_allocated_to_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_requests
    ADD CONSTRAINT store_requests_allocated_to_worker_id_fkey FOREIGN KEY (allocated_to_worker_id) REFERENCES public.users(id);


--
-- TOC entry 5445 (class 2606 OID 28095)
-- Name: store_requests store_requests_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_requests
    ADD CONSTRAINT store_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- TOC entry 5446 (class 2606 OID 28085)
-- Name: store_requests store_requests_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_requests
    ADD CONSTRAINT store_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5447 (class 2606 OID 28090)
-- Name: store_requests store_requests_project_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_requests
    ADD CONSTRAINT store_requests_project_manager_id_fkey FOREIGN KEY (project_manager_id) REFERENCES public.users(id);


--
-- TOC entry 5448 (class 2606 OID 28100)
-- Name: store_requests store_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_requests
    ADD CONSTRAINT store_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- TOC entry 5449 (class 2606 OID 28105)
-- Name: store_requests store_requests_responded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_requests
    ADD CONSTRAINT store_requests_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES public.users(id);


--
-- TOC entry 5378 (class 2606 OID 18948)
-- Name: users users_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- TOC entry 5379 (class 2606 OID 18812)
-- Name: users users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5407 (class 2606 OID 19296)
-- Name: vendor_bids vendor_bids_demand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_bids
    ADD CONSTRAINT vendor_bids_demand_id_fkey FOREIGN KEY (demand_id) REFERENCES public.vendor_demands(id) ON DELETE CASCADE;


--
-- TOC entry 5408 (class 2606 OID 19301)
-- Name: vendor_bids vendor_bids_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_bids
    ADD CONSTRAINT vendor_bids_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.users(id);


--
-- TOC entry 5404 (class 2606 OID 19243)
-- Name: vendor_demands vendor_demands_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_demands
    ADD CONSTRAINT vendor_demands_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- TOC entry 5405 (class 2606 OID 19248)
-- Name: vendor_demands vendor_demands_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_demands
    ADD CONSTRAINT vendor_demands_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


-- Completed on 2026-05-27 10:11:29

--
-- PostgreSQL database dump complete
--

\unrestrict P9PJ5CZ7VasQkTrLFB8DhQMAAAK5Y61PdG8aANQXZVicoiGufTNc1wasm0KhZKE


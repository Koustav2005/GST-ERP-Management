--
-- PostgreSQL database dump
--

\restrict YlnXdrrmj1Yq3xyKIfLuqouCieva73QVcwiyCLfRRIBu9xfFtuuV7kMlaMOSHc5

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: allocation_inventory_mapping; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.allocation_inventory_mapping (
    id integer NOT NULL,
    allocation_task_id integer NOT NULL,
    barcode_id integer NOT NULL,
    allocated_quantity numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.allocation_inventory_mapping OWNER TO postgres;

--
-- Name: allocation_inventory_mapping_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.allocation_inventory_mapping_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.allocation_inventory_mapping_id_seq OWNER TO postgres;

--
-- Name: allocation_inventory_mapping_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.allocation_inventory_mapping_id_seq OWNED BY public.allocation_inventory_mapping.id;


--
-- Name: allocation_tasks; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT allocation_tasks_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('confirmed'::character varying)::text, ('cancelled'::character varying)::text])))
);


ALTER TABLE public.allocation_tasks OWNER TO postgres;

--
-- Name: allocation_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.allocation_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.allocation_tasks_id_seq OWNER TO postgres;

--
-- Name: allocation_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.allocation_tasks_id_seq OWNED BY public.allocation_tasks.id;


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance (
    id integer NOT NULL,
    user_id integer NOT NULL,
    company_id integer NOT NULL,
    login_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    logout_time timestamp without time zone,
    date date DEFAULT CURRENT_DATE NOT NULL
);


ALTER TABLE public.attendance OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attendance_id_seq OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: barcodes; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.barcodes OWNER TO postgres;

--
-- Name: barcodes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.barcodes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.barcodes_id_seq OWNER TO postgres;

--
-- Name: barcodes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.barcodes_id_seq OWNED BY public.barcodes.id;


--
-- Name: bid_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bid_items (
    id integer NOT NULL,
    bid_id integer NOT NULL,
    demand_item_id integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bid_items OWNER TO postgres;

--
-- Name: bid_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bid_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bid_items_id_seq OWNER TO postgres;

--
-- Name: bid_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bid_items_id_seq OWNED BY public.bid_items.id;


--
-- Name: bill_of_materials; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.bill_of_materials OWNER TO postgres;

--
-- Name: bill_of_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bill_of_materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bill_of_materials_id_seq OWNER TO postgres;

--
-- Name: bill_of_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bill_of_materials_id_seq OWNED BY public.bill_of_materials.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    gst_number character varying(15),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    state character varying(100)
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.companies_id_seq OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: demand_items; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.demand_items OWNER TO postgres;

--
-- Name: demand_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.demand_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.demand_items_id_seq OWNER TO postgres;

--
-- Name: demand_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.demand_items_id_seq OWNED BY public.demand_items.id;


--
-- Name: enquiries; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.enquiries OWNER TO postgres;

--
-- Name: enquiries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.enquiries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.enquiries_id_seq OWNER TO postgres;

--
-- Name: enquiries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.enquiries_id_seq OWNED BY public.enquiries.id;


--
-- Name: external_job_work; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.external_job_work (
    id integer NOT NULL,
    external_job_id character varying(50) NOT NULL,
    enquiry_id integer,
    company_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    assigned_to integer,
    created_by integer NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    po_number character varying(50),
    po_filename character varying(255),
    po_path character varying(255),
    priority character varying(50) DEFAULT 'medium'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.external_job_work OWNER TO postgres;

--
-- Name: external_job_work_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.external_job_work_history (
    id integer NOT NULL,
    job_work_id integer NOT NULL,
    old_status character varying(50),
    new_status character varying(50),
    changed_by integer NOT NULL,
    notes text,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.external_job_work_history OWNER TO postgres;

--
-- Name: external_job_work_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.external_job_work_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.external_job_work_history_id_seq OWNER TO postgres;

--
-- Name: external_job_work_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.external_job_work_history_id_seq OWNED BY public.external_job_work_history.id;


--
-- Name: external_job_work_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.external_job_work_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.external_job_work_id_seq OWNER TO postgres;

--
-- Name: external_job_work_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.external_job_work_id_seq OWNED BY public.external_job_work.id;


--
-- Name: external_job_work_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.external_job_work_items (
    id integer NOT NULL,
    job_work_id integer NOT NULL,
    item_name character varying(255) NOT NULL,
    description text,
    quantity numeric(10,2),
    unit character varying(50),
    hsn character varying(50),
    estimated_cost numeric(10,2),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.external_job_work_items OWNER TO postgres;

--
-- Name: external_job_work_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.external_job_work_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.external_job_work_items_id_seq OWNER TO postgres;

--
-- Name: external_job_work_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.external_job_work_items_id_seq OWNED BY public.external_job_work_items.id;


--
-- Name: external_jobwork_challans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.external_jobwork_challans (
    id integer NOT NULL,
    notification_id integer NOT NULL,
    job_work_id integer,
    company_id integer NOT NULL,
    accountant_id integer NOT NULL,
    store_incharge_id integer NOT NULL,
    challan_number character varying(100) NOT NULL,
    material_description text NOT NULL,
    quantity numeric(10,2),
    unit character varying(50),
    expected_arrival_date date,
    notes text,
    challan_status character varying(50) DEFAULT 'pending'::character varying,
    received_at timestamp without time zone,
    received_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.external_jobwork_challans OWNER TO postgres;

--
-- Name: external_jobwork_challans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.external_jobwork_challans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.external_jobwork_challans_id_seq OWNER TO postgres;

--
-- Name: external_jobwork_challans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.external_jobwork_challans_id_seq OWNED BY public.external_jobwork_challans.id;


--
-- Name: external_jobwork_inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.external_jobwork_inventory (
    id integer NOT NULL,
    challan_id integer NOT NULL,
    job_work_id integer,
    company_id integer NOT NULL,
    material_name character varying(255) NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit character varying(50) NOT NULL,
    hsn_code character varying(50),
    gst_rate numeric(5,2),
    received_quantity numeric(10,2),
    received_date timestamp without time zone,
    received_by integer,
    status character varying(50) DEFAULT 'pending'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.external_jobwork_inventory OWNER TO postgres;

--
-- Name: external_jobwork_inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.external_jobwork_inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.external_jobwork_inventory_id_seq OWNER TO postgres;

--
-- Name: external_jobwork_inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.external_jobwork_inventory_id_seq OWNED BY public.external_jobwork_inventory.id;


--
-- Name: external_jobwork_material_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.external_jobwork_material_notifications (
    id integer NOT NULL,
    job_work_id integer,
    npd_user_id integer NOT NULL,
    accountant_id integer,
    company_id integer NOT NULL,
    material_description text CONSTRAINT external_jobwork_material_notific_material_description_not_null NOT NULL,
    expected_arrival_date date,
    material_details jsonb,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.external_jobwork_material_notifications OWNER TO postgres;

--
-- Name: external_jobwork_material_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.external_jobwork_material_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.external_jobwork_material_notifications_id_seq OWNER TO postgres;

--
-- Name: external_jobwork_material_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.external_jobwork_material_notifications_id_seq OWNED BY public.external_jobwork_material_notifications.id;


--
-- Name: external_jobwork_outstock_request_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.external_jobwork_outstock_request_items (
    id integer NOT NULL,
    request_id integer NOT NULL,
    material_id integer,
    material_name character varying(255) NOT NULL,
    requested_quantity numeric(10,2) CONSTRAINT external_jobwork_outstock_request_i_requested_quantity_not_null NOT NULL,
    unit character varying(50) NOT NULL,
    available_quantity numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.external_jobwork_outstock_request_items OWNER TO postgres;

--
-- Name: external_jobwork_outstock_request_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.external_jobwork_outstock_request_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.external_jobwork_outstock_request_items_id_seq OWNER TO postgres;

--
-- Name: external_jobwork_outstock_request_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.external_jobwork_outstock_request_items_id_seq OWNED BY public.external_jobwork_outstock_request_items.id;


--
-- Name: external_jobwork_outstock_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.external_jobwork_outstock_requests (
    id integer NOT NULL,
    project_id integer NOT NULL,
    worker_id integer NOT NULL,
    requested_by integer NOT NULL,
    company_id integer NOT NULL,
    request_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    request_notes text,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.external_jobwork_outstock_requests OWNER TO postgres;

--
-- Name: external_jobwork_outstock_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.external_jobwork_outstock_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.external_jobwork_outstock_requests_id_seq OWNER TO postgres;

--
-- Name: external_jobwork_outstock_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.external_jobwork_outstock_requests_id_seq OWNED BY public.external_jobwork_outstock_requests.id;


--
-- Name: external_jobwork_outstock_transaction_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.external_jobwork_outstock_transaction_items (
    id integer NOT NULL,
    transaction_id integer CONSTRAINT external_jobwork_outstock_transaction_i_transaction_id_not_null NOT NULL,
    material_name character varying(255) CONSTRAINT external_jobwork_outstock_transaction_it_material_name_not_null NOT NULL,
    issued_quantity numeric(10,2) CONSTRAINT external_jobwork_outstock_transaction__issued_quantity_not_null NOT NULL,
    unit character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.external_jobwork_outstock_transaction_items OWNER TO postgres;

--
-- Name: external_jobwork_outstock_transaction_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.external_jobwork_outstock_transaction_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.external_jobwork_outstock_transaction_items_id_seq OWNER TO postgres;

--
-- Name: external_jobwork_outstock_transaction_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.external_jobwork_outstock_transaction_items_id_seq OWNED BY public.external_jobwork_outstock_transaction_items.id;


--
-- Name: external_jobwork_outstock_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.external_jobwork_outstock_transactions (
    id integer NOT NULL,
    request_id integer NOT NULL,
    project_id integer NOT NULL,
    worker_id integer NOT NULL,
    issued_by integer NOT NULL,
    company_id integer NOT NULL,
    fulfillment_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    qr_verification_status character varying(50),
    qr_scan_time timestamp without time zone,
    transaction_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.external_jobwork_outstock_transactions OWNER TO postgres;

--
-- Name: external_jobwork_outstock_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.external_jobwork_outstock_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.external_jobwork_outstock_transactions_id_seq OWNER TO postgres;

--
-- Name: external_jobwork_outstock_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.external_jobwork_outstock_transactions_id_seq OWNED BY public.external_jobwork_outstock_transactions.id;


--
-- Name: external_material_collections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.external_material_collections (
    id integer NOT NULL,
    request_id integer NOT NULL,
    collected_by integer NOT NULL,
    collection_timestamp timestamp without time zone NOT NULL,
    status character varying(50) DEFAULT 'completed'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.external_material_collections OWNER TO postgres;

--
-- Name: external_material_collections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.external_material_collections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.external_material_collections_id_seq OWNER TO postgres;

--
-- Name: external_material_collections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.external_material_collections_id_seq OWNED BY public.external_material_collections.id;


--
-- Name: gst_rates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gst_rates (
    id integer NOT NULL,
    rate numeric(5,2) NOT NULL,
    label character varying(50) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.gst_rates OWNER TO postgres;

--
-- Name: gst_rates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.gst_rates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gst_rates_id_seq OWNER TO postgres;

--
-- Name: gst_rates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.gst_rates_id_seq OWNED BY public.gst_rates.id;


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.inventory OWNER TO postgres;

--
-- Name: inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_id_seq OWNER TO postgres;

--
-- Name: inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_id_seq OWNED BY public.inventory.id;


--
-- Name: job_work_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_work_images (
    id integer NOT NULL,
    job_work_id integer,
    file_path text NOT NULL,
    file_name character varying(255) NOT NULL
);


ALTER TABLE public.job_work_images OWNER TO postgres;

--
-- Name: job_work_images_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_work_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_work_images_id_seq OWNER TO postgres;

--
-- Name: job_work_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_work_images_id_seq OWNED BY public.job_work_images.id;


--
-- Name: job_work_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_work_items (
    id integer NOT NULL,
    job_work_id integer,
    material_name character varying(255) NOT NULL,
    hsn character varying(50),
    quantity numeric(10,2) NOT NULL,
    unit character varying(50) NOT NULL,
    stock_item_id integer,
    unit_value numeric(14,2),
    bom_item_id integer,
    revision_bom_item_id integer,
    item_kind character varying(20) DEFAULT 'stock'::character varying NOT NULL,
    CONSTRAINT job_work_items_item_kind_check CHECK (((item_kind)::text = ANY ((ARRAY['stock'::character varying, 'product'::character varying])::text[]))),
    CONSTRAINT job_work_items_one_bom_source CHECK (((bom_item_id IS NULL) OR (revision_bom_item_id IS NULL)))
);


ALTER TABLE public.job_work_items OWNER TO postgres;

--
-- Name: job_work_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_work_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_work_items_id_seq OWNER TO postgres;

--
-- Name: job_work_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_work_items_id_seq OWNED BY public.job_work_items.id;


--
-- Name: job_work_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_work_requests (
    id integer NOT NULL,
    job_id character varying(50) NOT NULL,
    project_id integer,
    company_id integer,
    job_work_type character varying(100) NOT NULL,
    purpose text,
    loaded_vehicle_weight numeric(10,2),
    unloaded_vehicle_weight numeric(10,2),
    actual_vehicle_weight numeric(10,2),
    accountant_id integer,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    challan_file_path text,
    challan_file_name text,
    vendor_email character varying(255),
    status character varying(20) DEFAULT 'pending'::character varying,
    store_incharge_id integer,
    vehicle_no character varying(50)
);


ALTER TABLE public.job_work_requests OWNER TO postgres;

--
-- Name: job_work_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_work_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_work_requests_id_seq OWNER TO postgres;

--
-- Name: job_work_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_work_requests_id_seq OWNED BY public.job_work_requests.id;


--
-- Name: jobwork_dc_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobwork_dc_items (
    id integer NOT NULL,
    dc_id integer NOT NULL,
    job_work_item_id integer NOT NULL,
    stock_item_id integer NOT NULL,
    description character varying(255),
    hsn_code character varying(50),
    quantity numeric(12,3) NOT NULL,
    unit character varying(50) NOT NULL,
    unit_value numeric(14,2) DEFAULT 0 NOT NULL,
    total_value numeric(14,2) DEFAULT 0 NOT NULL,
    returned_quantity numeric(12,3) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT jobwork_dc_items_check CHECK (((returned_quantity >= (0)::numeric) AND (returned_quantity <= quantity))),
    CONSTRAINT jobwork_dc_items_quantity_check CHECK ((quantity > (0)::numeric))
);


ALTER TABLE public.jobwork_dc_items OWNER TO postgres;

--
-- Name: jobwork_dc_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.jobwork_dc_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jobwork_dc_items_id_seq OWNER TO postgres;

--
-- Name: jobwork_dc_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.jobwork_dc_items_id_seq OWNED BY public.jobwork_dc_items.id;


--
-- Name: jobwork_dc_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobwork_dc_movements (
    id integer NOT NULL,
    dc_id integer NOT NULL,
    from_vendor_id integer NOT NULL,
    to_vendor_id integer NOT NULL,
    vendor_dc_no character varying(50),
    moved_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    note text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT jobwork_dc_movements_check CHECK ((from_vendor_id <> to_vendor_id))
);


ALTER TABLE public.jobwork_dc_movements OWNER TO postgres;

--
-- Name: jobwork_dc_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.jobwork_dc_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jobwork_dc_movements_id_seq OWNER TO postgres;

--
-- Name: jobwork_dc_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.jobwork_dc_movements_id_seq OWNED BY public.jobwork_dc_movements.id;


--
-- Name: jobwork_dcs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobwork_dcs (
    id integer NOT NULL,
    company_id integer NOT NULL,
    dc_number character varying(50) NOT NULL,
    dc_date date DEFAULT CURRENT_DATE NOT NULL,
    vendor_id integer NOT NULL,
    vendor_name character varying(255) NOT NULL,
    vendor_gstin character varying(100),
    vendor_address text,
    process character varying(255),
    vehicle_number character varying(50),
    loaded_vehicle_weight numeric(10,2),
    unloaded_vehicle_weight numeric(10,2),
    eway_bill_no character varying(50),
    current_location_vendor_id integer,
    status character varying(30) DEFAULT 'dc_created'::character varying NOT NULL,
    created_by integer,
    approved_by integer,
    approved_at timestamp without time zone,
    rejection_reason text,
    dispatched_at timestamp without time zone,
    closed_at timestamp without time zone,
    attachment_path text,
    attachment_name text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT jobwork_dcs_status_check CHECK (((status)::text = ANY ((ARRAY['dc_created'::character varying, 'approved'::character varying, 'rejected'::character varying, 'dispatched'::character varying, 'partially_returned'::character varying, 'closed'::character varying])::text[])))
);


ALTER TABLE public.jobwork_dcs OWNER TO postgres;

--
-- Name: jobwork_dcs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.jobwork_dcs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jobwork_dcs_id_seq OWNER TO postgres;

--
-- Name: jobwork_dcs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.jobwork_dcs_id_seq OWNED BY public.jobwork_dcs.id;


--
-- Name: jobwork_return_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobwork_return_items (
    id integer NOT NULL,
    return_id integer NOT NULL,
    dc_item_id integer NOT NULL,
    quantity_received numeric(12,3) NOT NULL,
    CONSTRAINT jobwork_return_items_quantity_received_check CHECK ((quantity_received > (0)::numeric))
);


ALTER TABLE public.jobwork_return_items OWNER TO postgres;

--
-- Name: jobwork_return_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.jobwork_return_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jobwork_return_items_id_seq OWNER TO postgres;

--
-- Name: jobwork_return_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.jobwork_return_items_id_seq OWNED BY public.jobwork_return_items.id;


--
-- Name: jobwork_returns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobwork_returns (
    id integer NOT NULL,
    dc_id integer NOT NULL,
    vendor_id integer NOT NULL,
    vendor_dc_no character varying(50),
    vendor_dc_date date,
    invoice_no character varying(50),
    invoice_date date,
    job_charge numeric(14,2) DEFAULT 0 NOT NULL,
    sac_code character varying(20),
    gst_rate_id integer,
    gst_amount numeric(14,2) DEFAULT 0 NOT NULL,
    total numeric(14,2) DEFAULT 0 NOT NULL,
    received_by integer,
    received_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cgst_amount numeric(14,2) DEFAULT 0 NOT NULL,
    sgst_amount numeric(14,2) DEFAULT 0 NOT NULL,
    igst_amount numeric(14,2) DEFAULT 0 NOT NULL,
    entry_type character varying(20) DEFAULT 'return'::character varying NOT NULL,
    CONSTRAINT jobwork_returns_entry_type_check CHECK (((entry_type)::text = ANY ((ARRAY['return'::character varying, 'invoice_only'::character varying])::text[]))),
    CONSTRAINT jobwork_returns_job_charge_check CHECK ((job_charge >= (0)::numeric))
);


ALTER TABLE public.jobwork_returns OWNER TO postgres;

--
-- Name: jobwork_returns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.jobwork_returns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jobwork_returns_id_seq OWNER TO postgres;

--
-- Name: jobwork_returns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.jobwork_returns_id_seq OWNED BY public.jobwork_returns.id;


--
-- Name: major_orders; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.major_orders OWNER TO postgres;

--
-- Name: major_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.major_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.major_orders_id_seq OWNER TO postgres;

--
-- Name: major_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.major_orders_id_seq OWNED BY public.major_orders.id;


--
-- Name: master_materials; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.master_materials OWNER TO postgres;

--
-- Name: master_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.master_materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.master_materials_id_seq OWNER TO postgres;

--
-- Name: master_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.master_materials_id_seq OWNED BY public.master_materials.id;


--
-- Name: master_vendors; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.master_vendors OWNER TO postgres;

--
-- Name: master_vendors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.master_vendors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.master_vendors_id_seq OWNER TO postgres;

--
-- Name: master_vendors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.master_vendors_id_seq OWNED BY public.master_vendors.id;


--
-- Name: material_usage_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.material_usage_reports (
    id integer NOT NULL,
    project_id integer,
    project_name character varying(255),
    sent_by integer NOT NULL,
    sent_by_name character varying(255),
    accountant_id integer NOT NULL,
    accountant_name character varying(255),
    materials jsonb NOT NULL,
    notes text,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT material_usage_reports_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'reviewed'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.material_usage_reports OWNER TO postgres;

--
-- Name: material_usage_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.material_usage_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.material_usage_reports_id_seq OWNER TO postgres;

--
-- Name: material_usage_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.material_usage_reports_id_seq OWNED BY public.material_usage_reports.id;


--
-- Name: materials_detail; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT materials_detail_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('ordered'::character varying)::text, ('received'::character varying)::text, ('cancelled'::character varying)::text])))
);


ALTER TABLE public.materials_detail OWNER TO postgres;

--
-- Name: materials_detail_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.materials_detail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.materials_detail_id_seq OWNER TO postgres;

--
-- Name: materials_detail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.materials_detail_id_seq OWNED BY public.materials_detail.id;


--
-- Name: minor_order_bids; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT minor_order_bids_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('accepted'::character varying)::text, ('rejected'::character varying)::text])))
);


ALTER TABLE public.minor_order_bids OWNER TO postgres;

--
-- Name: minor_order_bids_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.minor_order_bids_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.minor_order_bids_id_seq OWNER TO postgres;

--
-- Name: minor_order_bids_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.minor_order_bids_id_seq OWNED BY public.minor_order_bids.id;


--
-- Name: minor_orders; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT minor_orders_status_check CHECK (((status)::text = ANY (ARRAY[('open'::character varying)::text, ('awarded'::character varying)::text, ('cancelled'::character varying)::text])))
);


ALTER TABLE public.minor_orders OWNER TO postgres;

--
-- Name: minor_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.minor_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.minor_orders_id_seq OWNER TO postgres;

--
-- Name: minor_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.minor_orders_id_seq OWNED BY public.minor_orders.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(50) DEFAULT 'info'::character varying,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    project_id integer,
    data jsonb
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: order_receipt_items; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.order_receipt_items OWNER TO postgres;

--
-- Name: order_receipt_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_receipt_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_receipt_items_id_seq OWNER TO postgres;

--
-- Name: order_receipt_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_receipt_items_id_seq OWNED BY public.order_receipt_items.id;


--
-- Name: order_receipts; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT order_receipts_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text])))
);


ALTER TABLE public.order_receipts OWNER TO postgres;

--
-- Name: order_receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_receipts_id_seq OWNER TO postgres;

--
-- Name: order_receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_receipts_id_seq OWNED BY public.order_receipts.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT orders_order_type_check CHECK (((order_type)::text = ANY (ARRAY[('major'::character varying)::text, ('minor'::character varying)::text]))),
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('approved'::character varying)::text, ('in_transit'::character varying)::text, ('delivered'::character varying)::text, ('cancelled'::character varying)::text])))
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_tokens_id_seq OWNER TO postgres;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- Name: project_internal_reports; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.project_internal_reports OWNER TO postgres;

--
-- Name: project_internal_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_internal_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_internal_reports_id_seq OWNER TO postgres;

--
-- Name: project_internal_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_internal_reports_id_seq OWNED BY public.project_internal_reports.id;


--
-- Name: project_status_history; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.project_status_history OWNER TO postgres;

--
-- Name: project_status_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_status_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_status_history_id_seq OWNER TO postgres;

--
-- Name: project_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_status_history_id_seq OWNED BY public.project_status_history.id;


--
-- Name: project_workers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_workers (
    id integer NOT NULL,
    project_id integer NOT NULL,
    worker_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_by integer
);


ALTER TABLE public.project_workers OWNER TO postgres;

--
-- Name: project_workers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_workers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_workers_id_seq OWNER TO postgres;

--
-- Name: project_workers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_workers_id_seq OWNED BY public.project_workers.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
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
    project_type character varying(50) DEFAULT 'regular'::character varying,
    CONSTRAINT projects_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('in_progress'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text])))
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.purchase_order_items OWNER TO postgres;

--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchase_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchase_order_items_id_seq OWNER TO postgres;

--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchase_order_items_id_seq OWNED BY public.purchase_order_items.id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.purchase_orders OWNER TO postgres;

--
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchase_orders_id_seq OWNER TO postgres;

--
-- Name: purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchase_orders_id_seq OWNED BY public.purchase_orders.id;


--
-- Name: requirement_items; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.requirement_items OWNER TO postgres;

--
-- Name: requirement_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.requirement_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.requirement_items_id_seq OWNER TO postgres;

--
-- Name: requirement_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.requirement_items_id_seq OWNED BY public.requirement_items.id;


--
-- Name: requirements; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.requirements OWNER TO postgres;

--
-- Name: requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.requirements_id_seq OWNER TO postgres;

--
-- Name: requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.requirements_id_seq OWNED BY public.requirements.id;


--
-- Name: revision_bom_items; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.revision_bom_items OWNER TO postgres;

--
-- Name: revision_bom_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.revision_bom_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.revision_bom_items_id_seq OWNER TO postgres;

--
-- Name: revision_bom_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.revision_bom_items_id_seq OWNED BY public.revision_bom_items.id;


--
-- Name: revisions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.revisions OWNER TO postgres;

--
-- Name: revisions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.revisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.revisions_id_seq OWNER TO postgres;

--
-- Name: revisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.revisions_id_seq OWNED BY public.revisions.id;


--
-- Name: stock_item_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_item_requests (
    id integer NOT NULL,
    company_id integer NOT NULL,
    requested_name character varying(255) NOT NULL,
    requested_hsn character varying(50),
    requested_unit character varying(50),
    note text,
    requested_by integer,
    requester_role character varying(50),
    job_work_item_id integer,
    dc_id integer,
    project_id integer,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    stock_item_id integer,
    reason text,
    resolved_by integer,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    source character varying(20) DEFAULT 'stock'::character varying NOT NULL,
    CONSTRAINT stock_item_requests_source_check CHECK (((source)::text = ANY ((ARRAY['stock'::character varying, 'product'::character varying])::text[]))),
    CONSTRAINT stock_item_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'created'::character varying, 'linked'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.stock_item_requests OWNER TO postgres;

--
-- Name: stock_item_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_item_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_item_requests_id_seq OWNER TO postgres;

--
-- Name: stock_item_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_item_requests_id_seq OWNED BY public.stock_item_requests.id;


--
-- Name: stock_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_items (
    id integer NOT NULL,
    company_id integer NOT NULL,
    name character varying(255) NOT NULL,
    hsn character varying(50),
    unit character varying(50) NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.stock_items OWNER TO postgres;

--
-- Name: stock_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_items_id_seq OWNER TO postgres;

--
-- Name: stock_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_items_id_seq OWNED BY public.stock_items.id;


--
-- Name: store_request_items; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.store_request_items OWNER TO postgres;

--
-- Name: store_request_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.store_request_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.store_request_items_id_seq OWNER TO postgres;

--
-- Name: store_request_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.store_request_items_id_seq OWNED BY public.store_request_items.id;


--
-- Name: store_requests; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT store_requests_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text, ('fulfilled'::character varying)::text, ('partially_allocated'::character varying)::text])))
);


ALTER TABLE public.store_requests OWNER TO postgres;

--
-- Name: store_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.store_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.store_requests_id_seq OWNER TO postgres;

--
-- Name: store_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.store_requests_id_seq OWNED BY public.store_requests.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('management'::character varying)::text, ('accountant'::character varying)::text, ('accounts'::character varying)::text, ('store_incharge'::character varying)::text, ('npd'::character varying)::text, ('project_manager'::character varying)::text, ('worker'::character varying)::text, ('sales_executive'::character varying)::text, ('vendor'::character varying)::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vendor_bids; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT vendor_bids_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('accepted'::character varying)::text, ('rejected'::character varying)::text])))
);


ALTER TABLE public.vendor_bids OWNER TO postgres;

--
-- Name: vendor_bids_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vendor_bids_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vendor_bids_id_seq OWNER TO postgres;

--
-- Name: vendor_bids_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vendor_bids_id_seq OWNED BY public.vendor_bids.id;


--
-- Name: vendor_demands; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT vendor_demands_status_check CHECK (((status)::text = ANY (ARRAY[('open'::character varying)::text, ('closed'::character varying)::text, ('awarded'::character varying)::text])))
);


ALTER TABLE public.vendor_demands OWNER TO postgres;

--
-- Name: vendor_demands_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vendor_demands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vendor_demands_id_seq OWNER TO postgres;

--
-- Name: vendor_demands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vendor_demands_id_seq OWNED BY public.vendor_demands.id;


--
-- Name: allocation_inventory_mapping id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.allocation_inventory_mapping ALTER COLUMN id SET DEFAULT nextval('public.allocation_inventory_mapping_id_seq'::regclass);


--
-- Name: allocation_tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.allocation_tasks ALTER COLUMN id SET DEFAULT nextval('public.allocation_tasks_id_seq'::regclass);


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: barcodes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barcodes ALTER COLUMN id SET DEFAULT nextval('public.barcodes_id_seq'::regclass);


--
-- Name: bid_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bid_items ALTER COLUMN id SET DEFAULT nextval('public.bid_items_id_seq'::regclass);


--
-- Name: bill_of_materials id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_of_materials ALTER COLUMN id SET DEFAULT nextval('public.bill_of_materials_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: demand_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demand_items ALTER COLUMN id SET DEFAULT nextval('public.demand_items_id_seq'::regclass);


--
-- Name: enquiries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enquiries ALTER COLUMN id SET DEFAULT nextval('public.enquiries_id_seq'::regclass);


--
-- Name: external_job_work id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_job_work ALTER COLUMN id SET DEFAULT nextval('public.external_job_work_id_seq'::regclass);


--
-- Name: external_job_work_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_job_work_history ALTER COLUMN id SET DEFAULT nextval('public.external_job_work_history_id_seq'::regclass);


--
-- Name: external_job_work_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_job_work_items ALTER COLUMN id SET DEFAULT nextval('public.external_job_work_items_id_seq'::regclass);


--
-- Name: external_jobwork_challans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_challans ALTER COLUMN id SET DEFAULT nextval('public.external_jobwork_challans_id_seq'::regclass);


--
-- Name: external_jobwork_inventory id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_inventory ALTER COLUMN id SET DEFAULT nextval('public.external_jobwork_inventory_id_seq'::regclass);


--
-- Name: external_jobwork_material_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_material_notifications ALTER COLUMN id SET DEFAULT nextval('public.external_jobwork_material_notifications_id_seq'::regclass);


--
-- Name: external_jobwork_outstock_request_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_outstock_request_items ALTER COLUMN id SET DEFAULT nextval('public.external_jobwork_outstock_request_items_id_seq'::regclass);


--
-- Name: external_jobwork_outstock_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_outstock_requests ALTER COLUMN id SET DEFAULT nextval('public.external_jobwork_outstock_requests_id_seq'::regclass);


--
-- Name: external_jobwork_outstock_transaction_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_outstock_transaction_items ALTER COLUMN id SET DEFAULT nextval('public.external_jobwork_outstock_transaction_items_id_seq'::regclass);


--
-- Name: external_jobwork_outstock_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_outstock_transactions ALTER COLUMN id SET DEFAULT nextval('public.external_jobwork_outstock_transactions_id_seq'::regclass);


--
-- Name: external_material_collections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_material_collections ALTER COLUMN id SET DEFAULT nextval('public.external_material_collections_id_seq'::regclass);


--
-- Name: gst_rates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gst_rates ALTER COLUMN id SET DEFAULT nextval('public.gst_rates_id_seq'::regclass);


--
-- Name: inventory id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory ALTER COLUMN id SET DEFAULT nextval('public.inventory_id_seq'::regclass);


--
-- Name: job_work_images id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_work_images ALTER COLUMN id SET DEFAULT nextval('public.job_work_images_id_seq'::regclass);


--
-- Name: job_work_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_work_items ALTER COLUMN id SET DEFAULT nextval('public.job_work_items_id_seq'::regclass);


--
-- Name: job_work_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_work_requests ALTER COLUMN id SET DEFAULT nextval('public.job_work_requests_id_seq'::regclass);


--
-- Name: jobwork_dc_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dc_items ALTER COLUMN id SET DEFAULT nextval('public.jobwork_dc_items_id_seq'::regclass);


--
-- Name: jobwork_dc_movements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dc_movements ALTER COLUMN id SET DEFAULT nextval('public.jobwork_dc_movements_id_seq'::regclass);


--
-- Name: jobwork_dcs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dcs ALTER COLUMN id SET DEFAULT nextval('public.jobwork_dcs_id_seq'::regclass);


--
-- Name: jobwork_return_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_return_items ALTER COLUMN id SET DEFAULT nextval('public.jobwork_return_items_id_seq'::regclass);


--
-- Name: jobwork_returns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_returns ALTER COLUMN id SET DEFAULT nextval('public.jobwork_returns_id_seq'::regclass);


--
-- Name: major_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.major_orders ALTER COLUMN id SET DEFAULT nextval('public.major_orders_id_seq'::regclass);


--
-- Name: master_materials id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_materials ALTER COLUMN id SET DEFAULT nextval('public.master_materials_id_seq'::regclass);


--
-- Name: master_vendors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_vendors ALTER COLUMN id SET DEFAULT nextval('public.master_vendors_id_seq'::regclass);


--
-- Name: material_usage_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_usage_reports ALTER COLUMN id SET DEFAULT nextval('public.material_usage_reports_id_seq'::regclass);


--
-- Name: materials_detail id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials_detail ALTER COLUMN id SET DEFAULT nextval('public.materials_detail_id_seq'::regclass);


--
-- Name: minor_order_bids id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.minor_order_bids ALTER COLUMN id SET DEFAULT nextval('public.minor_order_bids_id_seq'::regclass);


--
-- Name: minor_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.minor_orders ALTER COLUMN id SET DEFAULT nextval('public.minor_orders_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: order_receipt_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_receipt_items ALTER COLUMN id SET DEFAULT nextval('public.order_receipt_items_id_seq'::regclass);


--
-- Name: order_receipts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_receipts ALTER COLUMN id SET DEFAULT nextval('public.order_receipts_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- Name: project_internal_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_internal_reports ALTER COLUMN id SET DEFAULT nextval('public.project_internal_reports_id_seq'::regclass);


--
-- Name: project_status_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_status_history ALTER COLUMN id SET DEFAULT nextval('public.project_status_history_id_seq'::regclass);


--
-- Name: project_workers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_workers ALTER COLUMN id SET DEFAULT nextval('public.project_workers_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: purchase_order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items ALTER COLUMN id SET DEFAULT nextval('public.purchase_order_items_id_seq'::regclass);


--
-- Name: purchase_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.purchase_orders_id_seq'::regclass);


--
-- Name: requirement_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requirement_items ALTER COLUMN id SET DEFAULT nextval('public.requirement_items_id_seq'::regclass);


--
-- Name: requirements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requirements ALTER COLUMN id SET DEFAULT nextval('public.requirements_id_seq'::regclass);


--
-- Name: revision_bom_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revision_bom_items ALTER COLUMN id SET DEFAULT nextval('public.revision_bom_items_id_seq'::regclass);


--
-- Name: revisions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revisions ALTER COLUMN id SET DEFAULT nextval('public.revisions_id_seq'::regclass);


--
-- Name: stock_item_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_item_requests ALTER COLUMN id SET DEFAULT nextval('public.stock_item_requests_id_seq'::regclass);


--
-- Name: stock_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items ALTER COLUMN id SET DEFAULT nextval('public.stock_items_id_seq'::regclass);


--
-- Name: store_request_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_request_items ALTER COLUMN id SET DEFAULT nextval('public.store_request_items_id_seq'::regclass);


--
-- Name: store_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_requests ALTER COLUMN id SET DEFAULT nextval('public.store_requests_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vendor_bids id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_bids ALTER COLUMN id SET DEFAULT nextval('public.vendor_bids_id_seq'::regclass);


--
-- Name: vendor_demands id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_demands ALTER COLUMN id SET DEFAULT nextval('public.vendor_demands_id_seq'::regclass);


--
-- Data for Name: allocation_inventory_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.allocation_inventory_mapping (id, allocation_task_id, barcode_id, allocated_quantity, created_at) FROM stdin;
1	1	5	2.00	2026-05-23 08:31:39.092486
2	2	5	1.00	2026-05-23 08:32:21.343304
3	4	5	1.00	2026-05-23 10:02:30.673271
4	5	6	1.00	2026-05-23 12:09:42.1432
5	7	17	1.00	2026-05-23 12:14:03.282229
\.


--
-- Data for Name: allocation_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.allocation_tasks (id, store_request_id, worker_id, worker_name, allocation_qr_code, qr_number, allocated_items, status, created_at, confirmed_at, confirmed_by, created_by) FROM stdin;
5	6	21	Shivam	{"type":"allocation_task","qr_number":"ALLOC17795182665","id":5,"worker_id":21}	ALLOC17795182665	[{"hsn": "12367", "unit": "units", "qr_code": "QR00000006 ", "exp_date": "2028-11-10T18:30:00.000Z", "mfg_date": "2024-11-11T18:30:00.000Z", "quantity": 1, "material_name": "Ms sheet", "barcode_allocations": [{"quantity": 1, "barcode_id": 6, "barcode_data": "ITEM DETAILS\\nItem Name: Ms sheet\\nHSN: 12367\\nPurchased Date: 2026-03-16\\nManufacturing Date: 2024-11-12\\nExpiry Date: 2028-11-11\\nQuantity: 1\\nBatch Number: N/A\\nMaterial Info: N/A\\n\\nJSON Data: {\\"item_name\\":\\"Ms sheet\\",\\"hsn\\":\\"12367\\",\\"purchased_date\\":\\"2026-03-16\\",\\"mfg_date\\":\\"2024-11-12\\",\\"exp_date\\":\\"2028-11-11\\",\\"quantity\\":1,\\"batch_number\\":null,\\"material_info\\":null}"}]}, {"hsn": "12347", "unit": "ltr", "exp_date": null, "mfg_date": null, "quantity": 1, "material_name": "Trew"}]	confirmed	2026-05-23 12:07:46.534979	2026-05-23 12:09:42.1432	21	4
6	7	20	Deepak	{"type":"allocation_task","qr_number":"ALLOC17795185852","id":6,"worker_id":20}	ALLOC17795185852	[{"hsn": "12367", "unit": "units", "qr_code": "QR00000017", "exp_date": null, "mfg_date": null, "quantity": 1, "material_name": "Ms sheet", "barcode_allocations": [{"quantity": 1, "barcode_id": 17, "barcode_data": "Item: Ms sheet\\nQty: 5\\nDate: 2026-05-22T21:07:24.300Z\\nJSON Data: {\\"item_name\\":\\"Ms sheet\\",\\"hsn\\":\\"12367\\",\\"quantity\\":5,\\"unit\\":\\"\\",\\"company_id\\":\\"1\\",\\"receipt_id\\":31,\\"purchase_order_id\\":\\"26\\"}"}]}]	pending	2026-05-23 12:13:05.245503	\N	\N	4
1	1	20	Deepak	{"type":"allocation_task","qr_number":"ALLOC17795030251","id":1,"worker_id":20}	ALLOC17795030251	[{"hsn": "1234", "unit": "units", "qr_code": "QR00000005 ", "exp_date": "2027-03-15T18:30:00.000Z", "mfg_date": "2026-03-15T18:30:00.000Z", "quantity": 2, "material_name": "TestItem", "barcode_allocations": [{"quantity": 2, "barcode_id": 5, "barcode_data": "ITEM DETAILS\\nJSON Data: {\\"quantity\\": 5}"}]}, {"hsn": "12347", "unit": "ltr", "exp_date": null, "mfg_date": null, "quantity": 2, "material_name": "Trew"}]	confirmed	2026-05-23 07:53:45.144631	2026-05-23 08:31:39.092486	20	4
2	2	20	Deepak	{"type":"allocation_task","qr_number":"ALLOC17795043216","id":2,"worker_id":20}	ALLOC17795043216	[{"hsn": "1234", "unit": "units", "qr_code": "QR00000005 ", "exp_date": "2027-03-15T18:30:00.000Z", "mfg_date": "2026-03-15T18:30:00.000Z", "quantity": 1, "material_name": "TestItem", "barcode_allocations": [{"quantity": 1, "barcode_id": 5, "barcode_data": "ITEM DETAILS\\nJSON Data: {\\"quantity\\": 5}"}]}]	confirmed	2026-05-23 08:15:21.645076	2026-05-23 08:32:21.343304	20	4
4	5	20	Deepak	{"type":"allocation_task","qr_number":"ALLOC17795106384","id":4,"worker_id":20}	ALLOC17795106384	[{"hsn": "1234", "unit": "units", "qr_code": "QR00000005 ", "exp_date": "2027-03-15T18:30:00.000Z", "mfg_date": "2026-03-15T18:30:00.000Z", "quantity": 1, "material_name": "TestItem", "barcode_allocations": [{"quantity": 1, "barcode_id": 5, "barcode_data": "ITEM DETAILS\\nJSON Data: {\\"quantity\\":2}  "}]}]	confirmed	2026-05-23 10:00:38.482067	2026-05-23 10:02:30.673271	20	4
7	8	21	Shivam	{"type":"allocation_task","qr_number":"ALLOC17795186068","id":7,"worker_id":21}	ALLOC17795186068	[{"hsn": "12367", "unit": "units", "qr_code": "QR00000017", "exp_date": null, "mfg_date": null, "quantity": 1, "material_name": "Ms sheet", "barcode_allocations": [{"quantity": 1, "barcode_id": 17, "barcode_data": "Item: Ms sheet\\nQty: 5\\nDate: 2026-05-22T21:07:24.300Z\\nJSON Data: {\\"item_name\\":\\"Ms sheet\\",\\"hsn\\":\\"12367\\",\\"quantity\\":5,\\"unit\\":\\"\\",\\"company_id\\":\\"1\\",\\"receipt_id\\":31,\\"purchase_order_id\\":\\"26\\"}"}]}]	confirmed	2026-05-23 12:13:26.869411	2026-05-23 12:14:03.282229	21	4
8	9	20	Deepak	{"type":"allocation_task","qr_number":"ALLOC17829616484","id":8,"worker_id":20}	ALLOC17829616484	[{"hsn": "1221", "unit": "pcs", "exp_date": null, "mfg_date": null, "quantity": 3, "material_name": "Steel"}]	confirmed	2026-07-02 08:37:28.47421	2026-07-02 14:01:46.85316	20	4
\.


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: postgres
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
207	1	1	2026-05-29 14:30:30.220542	2026-05-29 14:37:37.261778	2026-05-29
208	13	1	2026-05-29 14:38:50.143885	2026-05-29 14:41:10.05512	2026-05-29
209	4	1	2026-05-29 14:41:26.821901	2026-05-29 14:41:36.395666	2026-05-29
210	3	1	2026-05-29 14:41:46.181992	\N	2026-05-29
211	13	1	2026-05-29 14:43:00.332832	\N	2026-05-29
212	13	1	2026-05-29 14:46:31.254422	\N	2026-05-29
213	3	1	2026-05-29 14:48:58.17482	\N	2026-05-29
214	13	1	2026-05-29 14:49:08.09262	\N	2026-05-29
215	13	1	2026-05-29 14:52:01.198232	2026-05-29 14:54:31.443085	2026-05-29
216	13	1	2026-05-29 14:58:25.703148	\N	2026-05-29
217	13	1	2026-05-29 15:01:28.97388	\N	2026-05-29
218	13	1	2026-06-10 22:49:58.492257	2026-06-10 22:50:01.756383	2026-06-10
219	4	1	2026-06-10 22:50:17.36589	2026-06-10 22:50:21.573096	2026-06-10
220	13	1	2026-06-10 22:59:35.237221	2026-06-10 22:59:57.850887	2026-06-10
221	3	1	2026-06-10 23:00:11.077832	2026-06-10 23:08:11.668811	2026-06-10
222	13	1	2026-06-10 23:08:25.688947	\N	2026-06-10
223	13	1	2026-06-10 23:09:11.05324	\N	2026-06-10
224	13	1	2026-06-10 23:11:17.511423	2026-06-10 23:16:14.704024	2026-06-10
225	3	1	2026-06-10 23:16:25.670379	2026-06-10 23:16:35.985134	2026-06-10
226	4	1	2026-06-10 23:16:54.755427	\N	2026-06-10
227	4	1	2026-06-10 23:24:47.493786	2026-06-11 09:25:48.749844	2026-06-10
228	4	1	2026-06-11 09:26:01.275384	\N	2026-06-11
229	4	1	2026-06-11 09:27:20.157818	\N	2026-06-11
230	4	1	2026-06-11 09:33:49.246688	\N	2026-06-11
231	4	1	2026-06-11 09:37:32.678663	2026-06-11 09:40:03.518013	2026-06-11
232	4	1	2026-06-11 09:40:20.345185	\N	2026-06-11
233	4	1	2026-06-11 09:43:28.205791	2026-06-11 09:49:47.096399	2026-06-11
234	3	1	2026-06-11 09:50:14.68547	\N	2026-06-11
235	4	1	2026-06-11 09:59:24.011688	2026-06-11 09:59:33.860538	2026-06-11
236	3	1	2026-06-11 10:00:24.390388	2026-06-11 10:00:35.613153	2026-06-11
237	13	1	2026-06-11 10:01:13.530171	2026-06-11 10:03:11.551743	2026-06-11
238	4	1	2026-06-11 10:03:35.073904	2026-06-11 10:04:16.404613	2026-06-11
239	3	1	2026-06-11 10:04:58.447727	\N	2026-06-11
240	3	1	2026-06-11 10:12:12.30334	\N	2026-06-11
241	3	1	2026-06-11 12:07:38.428449	2026-06-11 12:07:49.71946	2026-06-11
242	13	1	2026-06-11 12:09:05.628872	2026-06-11 12:10:01.472886	2026-06-11
243	4	1	2026-06-11 12:10:26.281629	2026-06-11 12:11:10.417596	2026-06-11
244	3	1	2026-06-11 12:12:03.009657	\N	2026-06-11
245	13	1	2026-06-11 12:19:53.605174	2026-06-11 12:21:07.068076	2026-06-11
246	1	1	2026-06-11 12:27:31.94495	\N	2026-06-11
247	1	1	2026-06-11 12:33:57.413214	\N	2026-06-11
248	1	1	2026-06-11 12:37:26.180742	2026-06-11 12:39:47.440094	2026-06-11
249	2	1	2026-06-11 12:40:00.236137	2026-06-11 12:40:40.396324	2026-06-11
250	1	1	2026-06-11 12:41:58.883622	\N	2026-06-11
251	2	1	2026-06-11 12:51:42.320977	2026-06-11 12:52:42.502573	2026-06-11
252	13	1	2026-06-11 12:52:54.855148	\N	2026-06-11
253	13	1	2026-06-11 12:54:41.406769	\N	2026-06-11
254	13	1	2026-06-11 12:56:14.344846	2026-06-11 12:57:14.730173	2026-06-11
255	3	1	2026-06-11 12:57:43.064268	\N	2026-06-11
256	3	1	2026-06-11 21:56:54.759212	2026-06-11 21:57:19.257495	2026-06-11
257	13	1	2026-06-11 21:57:29.261492	2026-06-11 21:58:25.574122	2026-06-11
258	3	1	2026-06-11 21:58:37.555641	\N	2026-06-11
259	3	1	2026-06-11 22:03:00.391933	2026-06-11 22:03:09.135439	2026-06-11
260	13	1	2026-06-11 22:03:20.670931	\N	2026-06-11
261	13	1	2026-06-11 22:04:55.757099	2026-06-11 22:06:05.701509	2026-06-11
262	3	1	2026-06-11 22:06:34.18979	2026-06-11 23:01:26.197839	2026-06-11
263	3	1	2026-06-11 23:01:39.292575	\N	2026-06-11
264	3	1	2026-06-11 23:20:45.824743	2026-06-11 23:21:05.114145	2026-06-11
265	4	1	2026-06-11 23:21:18.049664	2026-06-11 23:21:56.158816	2026-06-11
266	3	1	2026-06-11 23:22:07.149114	2026-06-11 23:24:25.727103	2026-06-11
267	4	1	2026-06-11 23:24:39.639439	2026-06-11 23:24:58.292312	2026-06-11
268	3	1	2026-06-11 23:25:10.270517	2026-06-11 23:25:25.955693	2026-06-11
269	3	1	2026-06-11 23:25:36.795656	2026-06-11 23:25:43.563581	2026-06-11
270	4	1	2026-06-11 23:25:52.807535	2026-06-11 23:26:04.046841	2026-06-11
271	13	1	2026-06-11 23:36:33.535311	\N	2026-06-11
272	13	1	2026-06-11 23:39:07.870961	\N	2026-06-11
273	13	1	2026-06-11 23:47:18.72262	2026-06-11 23:48:06.553101	2026-06-11
274	3	1	2026-06-11 23:48:18.570009	\N	2026-06-11
275	3	1	2026-06-11 23:48:44.420283	2026-06-11 23:48:55.692525	2026-06-11
276	4	1	2026-06-11 23:49:08.258863	2026-06-11 23:49:34.468092	2026-06-11
277	3	1	2026-06-11 23:49:44.252168	\N	2026-06-11
278	3	1	2026-06-11 23:50:05.836528	2026-06-12 00:07:37.237799	2026-06-11
279	13	1	2026-06-12 00:07:51.510656	\N	2026-06-12
280	13	1	2026-06-12 00:13:27.313022	\N	2026-06-12
281	13	1	2026-06-12 00:18:10.383779	\N	2026-06-12
282	1	1	2026-06-12 02:42:51.551162	2026-06-12 02:44:03.96573	2026-06-12
283	2	1	2026-06-12 02:44:17.690245	2026-06-12 02:52:07.46705	2026-06-12
284	1	1	2026-06-12 02:52:33.315392	\N	2026-06-12
285	4	1	2026-06-17 00:08:38.0796	2026-06-17 00:09:02.354463	2026-06-17
286	3	1	2026-06-17 00:09:11.310409	2026-06-17 00:09:31.555843	2026-06-17
287	4	1	2026-06-17 00:09:46.187691	2026-06-17 00:10:21.761464	2026-06-17
288	3	1	2026-06-17 00:10:35.077933	2026-06-17 00:10:49.573435	2026-06-17
289	13	1	2026-06-17 00:11:10.527271	2026-06-17 00:14:17.302806	2026-06-17
290	3	1	2026-06-17 00:14:31.943908	2026-06-17 00:15:05.721867	2026-06-17
291	4	1	2026-06-17 00:15:16.413564	2026-06-17 00:16:08.217649	2026-06-17
292	3	1	2026-06-17 00:16:17.529578	2026-06-17 00:17:03.492874	2026-06-17
293	1	1	2026-06-17 00:17:15.626767	2026-06-17 00:18:29.092376	2026-06-17
294	2	1	2026-06-17 00:18:42.460441	2026-06-17 00:19:32.271955	2026-06-17
295	13	1	2026-06-17 00:19:42.738343	\N	2026-06-17
296	4	1	2026-06-17 00:38:52.273264	2026-06-17 00:40:28.214242	2026-06-17
297	3	1	2026-06-17 00:40:50.312768	2026-06-17 00:45:09.143311	2026-06-17
298	4	1	2026-06-17 00:45:22.114462	\N	2026-06-17
299	1	1	2026-07-01 20:37:57.833676	2026-07-01 20:39:29.868027	2026-07-01
300	2	1	2026-07-01 20:39:41.127339	2026-07-01 20:40:45.561959	2026-07-01
301	13	1	2026-07-01 20:40:56.78091	\N	2026-07-01
302	2	1	2026-07-02 01:07:27.637339	\N	2026-07-02
303	2	1	2026-07-02 01:18:44.210635	\N	2026-07-02
304	2	1	2026-07-02 01:44:43.501356	\N	2026-07-02
305	2	1	2026-07-02 01:49:19.088283	\N	2026-07-02
306	2	1	2026-07-02 02:08:25.314306	\N	2026-07-02
307	2	1	2026-07-02 03:02:19.952456	\N	2026-07-02
308	2	1	2026-07-02 03:14:33.78336	\N	2026-07-02
309	2	1	2026-07-02 03:30:24.049923	\N	2026-07-02
310	1	1	2026-07-02 07:49:04.776857	2026-07-02 07:50:30.383338	2026-07-02
311	2	1	2026-07-02 07:51:14.061087	2026-07-02 07:56:55.591736	2026-07-02
312	3	1	2026-07-02 07:57:12.596229	2026-07-02 08:11:34.789581	2026-07-02
313	2	1	2026-07-02 08:11:52.52731	\N	2026-07-02
314	2	1	2026-07-02 08:12:51.242607	\N	2026-07-02
315	2	1	2026-07-02 08:14:20.689127	\N	2026-07-02
316	2	1	2026-07-02 08:15:35.129776	\N	2026-07-02
317	2	1	2026-07-02 08:19:25.625781	\N	2026-07-02
318	2	1	2026-07-02 08:22:56.361754	\N	2026-07-02
320	3	1	2026-07-02 08:27:24.352417	\N	2026-07-02
319	2	1	2026-07-02 08:23:52.836449	2026-07-02 08:27:34.053102	2026-07-02
321	3	1	2026-07-02 08:27:41.850451	2026-07-02 08:33:35.341351	2026-07-02
322	4	1	2026-07-02 08:33:46.156351	2026-07-02 08:37:44.911951	2026-07-02
323	3	1	2026-07-02 08:37:55.873742	2026-07-02 08:38:31.362519	2026-07-02
324	4	1	2026-07-02 08:38:46.317608	\N	2026-07-02
325	4	1	2026-07-02 08:47:29.216889	\N	2026-07-02
326	4	1	2026-07-02 08:50:43.496739	2026-07-02 08:54:19.785253	2026-07-02
327	20	1	2026-07-02 08:54:32.786188	\N	2026-07-02
328	13	1	2026-07-02 08:55:15.674536	2026-07-02 09:14:00.088715	2026-07-02
329	4	1	2026-07-02 09:14:10.709315	\N	2026-07-02
330	13	1	2026-07-02 09:38:49.340396	\N	2026-07-02
331	4	1	2026-07-02 09:39:12.281573	\N	2026-07-02
332	13	1	2026-07-02 09:52:16.22812	\N	2026-07-02
333	13	1	2026-07-02 09:54:24.089047	\N	2026-07-02
334	13	1	2026-07-02 09:54:45.924381	\N	2026-07-02
335	13	1	2026-07-02 09:56:27.001658	\N	2026-07-02
336	4	1	2026-07-02 09:56:58.25274	\N	2026-07-02
337	4	1	2026-07-02 13:31:20.888347	2026-07-02 13:31:37.515972	2026-07-02
338	4	1	2026-07-02 13:31:49.867377	2026-07-02 13:32:22.218159	2026-07-02
339	4	1	2026-07-02 13:32:31.696235	\N	2026-07-02
340	4	1	2026-07-02 13:37:22.181432	2026-07-02 13:37:32.883389	2026-07-02
341	13	1	2026-07-02 13:37:58.051309	\N	2026-07-02
342	13	1	2026-07-02 13:39:23.830399	\N	2026-07-02
343	13	1	2026-07-02 13:50:06.120776	\N	2026-07-02
344	13	1	2026-07-02 13:50:58.642969	2026-07-02 13:51:16.81736	2026-07-02
345	4	1	2026-07-02 13:51:25.64452	\N	2026-07-02
346	4	1	2026-07-02 13:56:52.981329	2026-07-02 13:58:38.205515	2026-07-02
347	20	1	2026-07-02 13:58:55.480605	2026-07-02 13:59:03.433553	2026-07-02
348	21	1	2026-07-02 13:59:13.65632	2026-07-02 13:59:44.968793	2026-07-02
349	4	1	2026-07-02 14:00:07.190926	\N	2026-07-02
350	20	1	2026-07-02 14:01:37.699663	\N	2026-07-02
351	4	1	2026-07-03 07:55:26.007131	\N	2026-07-03
352	4	1	2026-07-03 07:56:30.079573	2026-07-03 08:02:34.812754	2026-07-03
354	13	1	2026-07-03 08:02:48.663073	2026-07-03 08:03:15.649966	2026-07-03
355	4	1	2026-07-03 08:03:25.283321	2026-07-03 08:21:29.00811	2026-07-03
356	13	1	2026-07-03 08:21:39.440594	2026-07-03 08:21:55.854836	2026-07-03
357	4	1	2026-07-03 08:22:11.858488	\N	2026-07-03
359	13	1	2026-07-03 08:37:12.130722	2026-07-03 08:37:45.905443	2026-07-03
360	20	1	2026-07-03 08:38:03.210188	2026-07-03 08:43:23.742195	2026-07-03
353	20	1	2026-07-03 07:57:32.175887	2026-07-03 08:43:23.755015	2026-07-03
361	13	1	2026-07-03 08:43:35.863945	2026-07-03 08:44:09.011343	2026-07-03
362	20	1	2026-07-03 08:44:39.852748	\N	2026-07-03
358	4	1	2026-07-03 08:29:29.791761	2026-07-03 08:46:28.654092	2026-07-03
363	2	1	2026-07-03 08:46:37.797162	2026-07-03 08:47:56.507353	2026-07-03
364	3	1	2026-07-03 08:48:07.993289	2026-07-03 09:04:34.887823	2026-07-03
365	4	1	2026-07-03 09:04:50.694403	2026-07-03 09:09:10.156691	2026-07-03
366	3	1	2026-07-03 09:09:19.63867	2026-07-03 09:09:28.594146	2026-07-03
367	4	1	2026-07-03 09:10:06.483223	\N	2026-07-03
368	4	1	2026-07-03 09:13:37.387744	\N	2026-07-03
369	4	1	2026-07-03 09:15:16.674846	2026-07-03 09:15:22.118283	2026-07-03
370	2	1	2026-07-03 09:15:32.914125	\N	2026-07-03
371	2	1	2026-07-03 09:16:21.572149	2026-07-03 09:17:42.600704	2026-07-03
372	3	1	2026-07-03 09:17:51.489628	2026-07-03 09:18:33.685817	2026-07-03
373	4	1	2026-07-03 09:18:45.192621	2026-07-03 09:39:48.28582	2026-07-03
374	4	1	2026-07-03 09:40:21.377337	\N	2026-07-03
375	4	1	2026-07-03 09:49:14.832995	2026-07-03 10:02:49.483484	2026-07-03
376	13	1	2026-07-03 10:03:01.534167	\N	2026-07-03
377	4	1	2026-07-03 10:10:37.806914	\N	2026-07-03
378	4	1	2026-07-03 10:14:25.737768	\N	2026-07-03
379	4	1	2026-07-03 10:17:01.553028	\N	2026-07-03
380	4	1	2026-07-03 10:17:43.155645	2026-07-03 10:31:58.497228	2026-07-03
382	1	1	2026-07-03 10:32:11.751024	\N	2026-07-03
381	20	1	2026-07-03 10:19:35.496221	2026-07-03 10:32:16.122513	2026-07-03
384	1	1	2026-07-03 10:33:34.644742	2026-07-03 10:39:16.047763	2026-07-03
383	2	1	2026-07-03 10:32:27.021512	2026-07-03 10:40:31.189891	2026-07-03
385	3	1	2026-07-03 10:39:47.102254	2026-07-03 10:41:13.37839	2026-07-03
387	13	1	2026-07-03 10:41:22.530306	2026-07-03 10:42:12.83624	2026-07-03
386	4	1	2026-07-03 10:40:44.084759	2026-07-03 10:42:18.371273	2026-07-03
389	20	1	2026-07-03 10:42:37.889802	2026-07-03 10:43:04.845315	2026-07-03
390	13	1	2026-07-03 10:43:13.610223	\N	2026-07-03
388	4	1	2026-07-03 10:42:28.087117	2026-07-03 10:43:41.219609	2026-07-03
391	13	1	2026-07-03 10:43:51.723139	2026-07-03 10:49:52.458087	2026-07-03
393	2	1	2026-07-03 11:42:02.330159	2026-07-03 11:42:31.293321	2026-07-03
394	3	1	2026-07-03 11:42:42.575342	2026-07-03 11:43:08.428259	2026-07-03
395	13	1	2026-07-03 11:44:34.420767	2026-07-03 11:45:01.575372	2026-07-03
396	20	1	2026-07-03 11:45:14.187518	2026-07-03 11:45:44.006824	2026-07-03
392	4	1	2026-07-03 10:50:04.717288	2026-07-03 11:49:46.762188	2026-07-03
398	2	1	2026-07-03 11:49:59.524154	2026-07-03 11:50:25.556895	2026-07-03
399	3	1	2026-07-03 11:50:35.661944	2026-07-03 11:50:57.218702	2026-07-03
400	4	1	2026-07-03 11:51:13.760498	2026-07-03 11:51:35.48988	2026-07-03
397	13	1	2026-07-03 11:46:10.036864	2026-07-03 11:52:27.764761	2026-07-03
402	20	1	2026-07-03 11:52:50.841026	2026-07-03 11:55:09.423825	2026-07-03
401	4	1	2026-07-03 11:52:04.501422	2026-07-03 11:56:13.483952	2026-07-03
404	2	1	2026-07-03 11:56:43.899712	2026-07-03 11:57:07.414911	2026-07-03
405	3	1	2026-07-03 11:57:18.10731	2026-07-03 11:57:46.735882	2026-07-03
403	13	1	2026-07-03 11:56:01.589322	2026-07-03 11:58:38.738706	2026-07-03
407	20	1	2026-07-03 11:59:33.922549	2026-07-03 11:59:59.544557	2026-07-03
408	13	1	2026-07-03 12:00:15.610962	2026-07-03 12:01:57.116354	2026-07-03
406	4	1	2026-07-03 11:57:58.929318	2026-07-03 12:02:12.415978	2026-07-03
409	1	1	2026-07-03 12:02:40.274175	2026-07-03 12:04:06.745043	2026-07-03
410	2	1	2026-07-03 12:03:09.855599	2026-07-03 12:05:08.155988	2026-07-03
411	3	1	2026-07-03 12:05:29.948461	2026-07-03 12:06:21.331843	2026-07-03
413	13	1	2026-07-03 12:07:13.325095	2026-07-03 12:07:52.170898	2026-07-03
412	4	1	2026-07-03 12:06:34.860305	2026-07-03 12:09:06.225824	2026-07-03
415	13	1	2026-07-03 12:09:15.718305	2026-07-03 12:10:33.214318	2026-07-03
416	2	1	2026-07-03 12:10:57.204908	2026-07-03 12:11:22.505351	2026-07-03
417	3	1	2026-07-03 12:11:31.122466	2026-07-03 12:11:49.19596	2026-07-03
418	4	1	2026-07-03 12:11:58.374839	2026-07-03 12:12:11.301948	2026-07-03
419	13	1	2026-07-03 12:12:24.58195	2026-07-03 12:14:03.522239	2026-07-03
420	4	1	2026-07-03 12:14:12.622843	2026-07-03 12:15:56.014206	2026-07-03
421	13	1	2026-07-03 12:16:05.273646	2026-07-03 12:19:33.619925	2026-07-03
422	2	1	2026-07-03 12:19:46.890231	2026-07-03 12:20:16.988117	2026-07-03
423	3	1	2026-07-03 12:20:28.002288	2026-07-03 12:20:50.309612	2026-07-03
414	20	1	2026-07-03 12:08:23.888409	2026-07-03 12:21:39.44422	2026-07-03
425	13	1	2026-07-03 12:21:49.964784	2026-07-03 12:22:03.962257	2026-07-03
426	20	1	2026-07-03 12:22:17.426193	2026-07-03 12:22:46.828903	2026-07-03
427	13	1	2026-07-03 12:22:57.459133	\N	2026-07-03
424	4	1	2026-07-03 12:20:58.798324	2026-07-03 12:28:17.294716	2026-07-03
429	2	1	2026-07-03 12:28:25.076154	2026-07-03 12:28:38.650588	2026-07-03
430	3	1	2026-07-03 12:28:47.148288	2026-07-03 12:29:05.296754	2026-07-03
431	4	1	2026-07-03 12:29:22.132507	\N	2026-07-03
428	13	1	2026-07-03 12:23:29.390364	2026-07-03 12:30:05.060854	2026-07-03
432	20	1	2026-07-03 12:30:24.252862	\N	2026-07-03
434	4	1	2026-07-03 12:33:33.874245	\N	2026-07-03
433	20	1	2026-07-03 12:30:55.09153	2026-07-03 12:34:01.57117	2026-07-03
435	13	1	2026-07-03 12:34:14.598833	\N	2026-07-03
436	13	1	2026-07-03 12:34:46.087257	2026-07-03 12:35:10.154737	2026-07-03
437	20	1	2026-07-03 12:35:20.643412	\N	2026-07-03
438	20	1	2026-07-03 12:36:09.739252	2026-07-03 12:39:16.513433	2026-07-03
439	13	1	2026-07-03 12:39:26.416678	2026-07-03 12:39:37.301663	2026-07-03
440	20	1	2026-07-03 12:40:01.662717	\N	2026-07-03
441	1	1	2026-07-07 12:06:34.086034	\N	2026-07-07
442	2	1	2026-07-07 12:07:03.457114	\N	2026-07-07
443	13	1	2026-07-07 12:09:31.940522	\N	2026-07-07
444	4	1	2026-07-07 12:11:53.168558	\N	2026-07-07
445	3	1	2026-07-07 12:21:39.626591	\N	2026-07-07
446	1	1	2026-07-12 12:02:24.897515	2026-07-12 12:02:47.613874	2026-07-12
447	2	1	2026-07-12 12:03:33.240569	2026-07-12 12:05:18.244944	2026-07-12
448	1	1	2026-07-12 12:11:14.735278	\N	2026-07-12
450	4	1	2026-07-15 13:56:22.237177	2026-07-15 14:02:25.666428	2026-07-15
451	2	1	2026-07-15 13:56:25.543116	2026-07-15 14:06:09.381921	2026-07-15
452	13	1	2026-07-15 14:02:55.742518	2026-07-15 14:06:33.554556	2026-07-15
453	3	1	2026-07-15 14:07:49.538719	2026-07-15 14:10:26.296526	2026-07-15
455	13	1	2026-07-15 14:10:37.604812	\N	2026-07-15
449	1	1	2026-07-15 13:56:14.430228	2026-07-15 14:13:20.225206	2026-07-15
456	20	1	2026-07-15 14:13:52.002472	\N	2026-07-15
454	4	1	2026-07-15 14:09:15.425972	2026-07-15 14:32:09.327627	2026-07-15
457	2	1	2026-07-15 14:32:27.5763	\N	2026-07-15
458	2	1	2026-07-16 13:55:20.948727	2026-07-16 13:55:25.425812	2026-07-16
459	1	1	2026-07-16 14:11:25.160738	2026-07-16 14:13:56.662727	2026-07-16
460	2	1	2026-07-16 14:11:55.636043	2026-07-16 14:30:49.817897	2026-07-16
462	3	1	2026-07-16 14:31:06.476672	2026-07-16 14:32:03.836307	2026-07-16
463	4	1	2026-07-16 14:32:20.022205	\N	2026-07-16
461	13	1	2026-07-16 14:14:05.822171	2026-07-16 14:35:31.078729	2026-07-16
464	1	1	2026-07-28 12:11:31.880551	2026-07-28 12:14:04.103664	2026-07-28
465	2	1	2026-07-28 12:14:19.56145	2026-07-28 12:21:19.320021	2026-07-28
466	1	1	2026-07-28 12:21:37.707574	2026-07-28 12:23:44.860029	2026-07-28
467	4	1	2026-07-28 12:24:11.712665	2026-07-28 12:31:02.993347	2026-07-28
468	1	1	2026-10-13 21:58:27.066595	2026-10-13 21:58:31.762101	2026-10-13
469	4	1	2026-10-14 05:54:35.155628	\N	2026-10-14
470	4	1	2026-10-14 05:55:44.272877	2026-10-14 06:00:15.545448	2026-10-14
471	3	1	2026-10-14 06:00:39.932803	2026-10-14 06:01:34.861712	2026-10-14
472	4	1	2026-10-14 06:01:47.405823	\N	2026-10-14
473	4	1	2026-10-14 06:10:52.1103	2026-10-14 06:11:13.619473	2026-10-14
474	3	1	2026-10-14 06:11:44.904056	2026-10-14 06:12:40.318181	2026-10-14
475	3	1	2026-10-14 06:12:51.107126	2026-10-14 06:12:53.634767	2026-10-14
476	4	1	2026-10-14 06:13:03.647423	\N	2026-10-14
477	3	1	2026-10-14 06:16:17.673468	2026-10-14 06:21:22.036627	2026-10-14
478	4	1	2026-10-14 06:21:37.44325	2026-10-14 06:23:58.346703	2026-10-14
479	3	1	2026-10-14 06:24:31.872868	2026-10-14 06:25:07.397164	2026-10-14
480	4	1	2026-10-14 06:25:46.674692	2026-10-14 06:32:40.48944	2026-10-14
481	3	1	2026-10-14 06:32:50.749969	2026-10-14 06:34:30.590884	2026-10-14
482	13	1	2026-10-14 06:35:01.599082	2026-10-14 06:44:05.157692	2026-10-14
483	1	1	2026-10-14 06:44:15.579596	\N	2026-10-14
484	13	1	2026-10-14 09:54:48.302368	\N	2026-10-14
485	13	1	2026-10-14 10:02:54.654004	\N	2026-10-14
486	13	1	2026-10-14 10:11:25.907063	\N	2026-10-14
487	13	1	2026-10-14 10:17:30.974355	2026-10-14 10:18:39.693866	2026-10-14
488	4	1	2026-10-14 10:19:04.671399	2026-10-14 10:19:32.488827	2026-10-14
489	3	1	2026-10-14 10:19:46.512108	\N	2026-10-14
490	13	1	2026-10-14 10:28:41.904028	2026-10-14 10:28:49.89236	2026-10-14
491	3	1	2026-10-14 10:29:02.189415	\N	2026-10-14
492	13	1	2026-10-14 10:29:45.197538	2026-10-14 10:29:55.802408	2026-10-14
493	3	1	2026-10-14 10:30:09.325926	\N	2026-10-14
494	3	1	2026-10-14 10:31:08.919438	2026-10-14 10:32:02.092991	2026-10-14
495	13	1	2026-10-14 10:38:06.899341	\N	2026-10-14
496	3	1	2026-10-14 10:38:42.076366	\N	2026-10-14
\.


--
-- Data for Name: barcodes; Type: TABLE DATA; Schema: public; Owner: postgres
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
19	\N	27	1	Steel	\N	2026-06-17	\N	\N	QR00000019	Item: Steel\nQty: 20\nDate: 2026-06-16T19:16:43.304Z\nJSON Data: {"item_name":"Steel","hsn":"","quantity":20,"unit":"","company_id":"1","receipt_id":32,"purchase_order_id":"27"}	2026-06-17 00:46:43.285962	\N
20	\N	27	1	Plastic	\N	2026-06-17	\N	\N	QR00000020	Item: Plastic\nQty: 9\nDate: 2026-06-16T19:16:43.316Z\nJSON Data: {"item_name":"Plastic","hsn":"","quantity":9,"unit":"","company_id":"1","receipt_id":32,"purchase_order_id":"27"}	2026-06-17 00:46:43.285962	\N
\.


--
-- Data for Name: bid_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bid_items (id, bid_id, demand_item_id, unit_price, total_price, created_at) FROM stdin;
\.


--
-- Data for Name: bill_of_materials; Type: TABLE DATA; Schema: public; Owner: postgres
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
10	13	\N	Rod	2.00	pcs	12211	\N	2026-06-11 12:47:54.124876	\N	\N
11	13	\N	Steel	3.00	pcs	1221	\N	2026-06-11 12:47:54.281611	\N	\N
12	21	\N	Steel	15.00	pcs	12245	\N	2026-07-15 14:34:30.907787	\N	\N
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, name, email, gst_number, created_at, updated_at, state) FROM stdin;
2	Shuhita Engineering	mmt@gmail.com	12SF54356CF7888	2026-04-09 21:57:51.701247	2026-04-09 21:57:51.701247	\N
3	Suhas Engineering 	patilakshata758@gmail.com	\N	2026-04-29 18:40:12.17774	2026-04-29 18:40:12.17774	\N
4	Test Role Company 1779501482267	admin.1779501482267@example.com	27AAAAA1111A1Z1	2026-05-23 07:28:02.410826	2026-05-23 07:28:02.410826	\N
5	Test Role Company 1779501529202	admin.1779501529202@example.com	27AAAAA1111A1Z1	2026-05-23 07:28:49.349173	2026-05-23 07:28:49.349173	\N
1	Subhash Engineering 	saurabh102@gmail.com	29AAAAA0000A1Z5	2026-02-04 01:41:20.152247	2026-02-04 01:41:20.152247	Karnataka
\.


--
-- Data for Name: demand_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.demand_items (id, demand_id, serial_number, item_name, quantity, unit, hsn, notes, created_at) FROM stdin;
\.


--
-- Data for Name: enquiries; Type: TABLE DATA; Schema: public; Owner: postgres
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
17	EN0008	1	1	1VE23CS100_CSE.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\EN0008_1VE23CS100_CSE.pdf	accepted_by_customer	\N	2026-06-11 12:28:46.06233	2026-06-11 12:46:00.478705	2	ALUMNI%20REGISTRATION%20FORM.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\QUOT_EN0008_ALUMNI%20REGISTRATION%20FORM.pdf	2026-06-11 12:40:32.22291	PO_EN0008_10th%20Marks%20Card.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0008_10th%20Marks%20Card.pdf	2026-06-11 12:46:00.312788	\N
18	EN0009	1	1	Cryptography%20and%20network%20security-%20BCS703.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\EN0009_Cryptography%20and%20network%20security-%20BCS703.pdf	accepted_by_customer	\N	2026-06-12 02:43:12.084036	2026-06-12 02:53:57.639089	2	\N	\N	\N	\N	\N	\N	\N
21	EN0012	1	1	Cryptography%20and%20network%20security-%20BCS703.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\EN0012_Cryptography%20and%20network%20security-%20BCS703.pdf	accepted_by_customer	\N	2026-07-02 07:49:56.966207	2026-07-02 07:50:20.706337	2	\N	\N	\N	PO_EN0012_Cryptography%20and%20network%20security-%20BCS703.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0012_Cryptography%20and%20network%20security-%20BCS703.pdf	2026-07-02 07:50:20.660571	\N
19	EN0010	1	1	Cryptography%20and%20network%20security-%20BCS703.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\EN0010_Cryptography%20and%20network%20security-%20BCS703.pdf	accepted_by_customer	\N	2026-06-17 00:17:56.25327	2026-06-17 00:18:22.991038	2	\N	\N	\N	PO_EN0010_Cryptography%20and%20network%20security-%20BCS703.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0010_Cryptography%20and%20network%20security-%20BCS703.pdf	2026-06-17 00:18:22.953881	\N
20	EN0011	1	1	Nemotron3Ultra_Free_Setup_Guide_TechwithNandini.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\EN0011_Nemotron3Ultra_Free_Setup_Guide_TechwithNandini.pdf	accepted_by_customer	\N	2026-07-01 20:38:31.610852	2026-07-01 20:39:03.45415	2	\N	\N	\N	PO_EN0011_Nemotron3Ultra_Free_Setup_Guide_TechwithNandini.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0011_Nemotron3Ultra_Free_Setup_Guide_TechwithNandini.pdf	2026-07-01 20:39:03.417868	\N
22	EN0013	1	1	Cryptography%20and%20network%20security-%20BCS703.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\EN0013_Cryptography%20and%20network%20security-%20BCS703.pdf	accepted_by_customer	\N	2026-07-03 10:32:35.13214	2026-07-03 10:38:14.963928	2	Nemotron3Ultra_Free_Setup_Guide_TechwithNandini.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\QUOT_EN0013_Nemotron3Ultra_Free_Setup_Guide_TechwithNandini.pdf	2026-07-03 10:32:58.55765	PO_EN0013_Cryptography%20and%20network%20security-%20BCS703.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0013_Cryptography%20and%20network%20security-%20BCS703.pdf	2026-07-03 10:38:14.832999	\N
24	EN0015	1	1	ticket-2.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\EN0015_ticket-2.pdf	accepted_by_customer	\N	2026-07-07 12:09:49.555222	2026-07-07 12:10:49.543844	2	Project%20Roles%20(1).pptx_20260702_133151_0000.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\QUOT_EN0015_Project%20Roles%20(1).pptx_20260702_133151_0000.pdf	2026-07-07 12:10:20.035566	PO_EN0015_ticket-1.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0015_ticket-1.pdf	2026-07-07 12:10:49.465744	\N
23	EN0014	1	1	Cryptography%20and%20network%20security-%20BCS703.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\EN0014_Cryptography%20and%20network%20security-%20BCS703.pdf	accepted_by_customer	\N	2026-07-03 12:02:49.406772	2026-07-03 12:03:47.106743	2	Nemotron3Ultra_Free_Setup_Guide_TechwithNandini.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\QUOT_EN0014_Nemotron3Ultra_Free_Setup_Guide_TechwithNandini.pdf	2026-07-03 12:03:25.788951	PO_EN0014_Cryptography%20and%20network%20security-%20BCS703.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0014_Cryptography%20and%20network%20security-%20BCS703.pdf	2026-07-03 12:03:47.027921	\N
25	EN0016	1	1	ticket-2.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\EN0016_ticket-2.pdf	pending	\N	2026-07-07 12:12:31.797693	2026-07-07 12:12:31.797693	\N	\N	\N	\N	\N	\N	\N	\N
26	EN0017	1	1	ticket-1.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\EN0017_ticket-1.pdf	accepted_by_customer	\N	2026-07-07 12:12:38.672311	2026-07-12 12:11:41.816801	2	Nemotron3Ultra_Free_Setup_Guide_TechwithNandini.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\QUOT_EN0017_Nemotron3Ultra_Free_Setup_Guide_TechwithNandini.pdf	2026-07-12 12:04:10.585224	PO_EN0017_Nemotron3Ultra_Free_Setup_Guide_TechwithNandini.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0017_Nemotron3Ultra_Free_Setup_Guide_TechwithNandini.pdf	2026-07-12 12:11:41.772622	\N
27	EN0018	1	1	ticket-2.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\EN0018_ticket-2.pdf	accepted_by_customer	\N	2026-07-15 13:56:52.080358	2026-07-15 14:01:24.186919	2	Strings_Qspiders.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\QUOT_EN0018_Strings_Qspiders.pdf	2026-07-15 13:58:00.736808	PO_EN0018_NumberPrograms_Qspiders.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0018_NumberPrograms_Qspiders.pdf	2026-07-15 14:01:24.076987	\N
28	EN0019	1	1	Admission%20Letter.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\EN0019_Admission%20Letter.pdf	accepted_by_customer	\N	2026-07-16 14:11:35.563281	2026-07-16 14:13:14.84906	2	Nemotron3Ultra_Free_Setup_Guide_TechwithNandini.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\QUOT_EN0019_Nemotron3Ultra_Free_Setup_Guide_TechwithNandini.pdf	2026-07-16 14:12:13.163165	PO_EN0019_Admission%20Letter.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0019_Admission%20Letter.pdf	2026-07-16 14:13:14.760592	\N
29	EN0020	1	1	Cryptography%20and%20network%20security-%20BCS703.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\EN0020_Cryptography%20and%20network%20security-%20BCS703.pdf	sent_to_npd	\N	2026-07-28 12:13:19.455846	2026-07-28 12:13:50.107565	2	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: external_job_work; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.external_job_work (id, external_job_id, enquiry_id, company_id, name, description, assigned_to, created_by, status, po_number, po_filename, po_path, priority, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: external_job_work_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.external_job_work_history (id, job_work_id, old_status, new_status, changed_by, notes, changed_at) FROM stdin;
\.


--
-- Data for Name: external_job_work_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.external_job_work_items (id, job_work_id, item_name, description, quantity, unit, hsn, estimated_cost, notes, created_at) FROM stdin;
\.


--
-- Data for Name: external_jobwork_challans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.external_jobwork_challans (id, notification_id, job_work_id, company_id, accountant_id, store_incharge_id, challan_number, material_description, quantity, unit, expected_arrival_date, notes, challan_status, received_at, received_by, created_at, updated_at) FROM stdin;
4	8	14	1	3	4	EJW-CHALLAN-1-1782961697041	Cupboard	2.00	Unit	2026-12-10		received	2026-07-02 08:38:59.856051	4	2026-07-02 08:38:17.05101	2026-07-02 08:38:59.856051
7	9	15	1	3	4	CHAL-1783049654207-5ftub6j1h	Chair	5.00	Unit	\N	\N	received	2026-07-03 09:07:18.87189	4	2026-07-03 09:04:14.264191	2026-07-03 09:04:14.264191
9	11	17	1	3	4	CHAL-1783055423973-qrcosl6qs	Asd	1.00	Unit	\N	\N	received	2026-07-03 10:40:58.259505	4	2026-07-03 10:40:24.146578	2026-07-03 10:40:24.146578
10	12	17	1	3	4	CHAL-1783059181397-n41tvpx3g	Dff	2.00	kg	\N	\N	received	2026-07-03 11:43:54.082845	4	2026-07-03 11:43:01.449199	2026-07-03 11:43:01.449199
11	13	17	1	3	4	CHAL-1783059652364-5zc7s8237	Dgdg	12.00	kg	\N	\N	received	2026-07-03 11:51:23.930967	4	2026-07-03 11:50:52.415649	2026-07-03 11:50:52.415649
12	14	17	1	3	4	CHAL-1783060059077-ddmk72nno	Fdfd	21.00	kg	\N	\N	received	2026-07-03 11:58:07.633422	4	2026-07-03 11:57:39.151941	2026-07-03 11:57:39.151941
13	15	18	1	3	4	CHAL-1783060564727-r4pmkadtn	Clamp 	2.00	Unit	\N	\N	received	2026-07-03 12:06:49.573405	4	2026-07-03 12:06:04.789101	2026-07-03 12:06:04.789101
14	16	18	1	3	4	CHAL-1783060904761-jijzzvn3k	Dy	12.00	kg	\N	\N	received	2026-07-03 12:12:06.833239	4	2026-07-03 12:11:44.838832	2026-07-03 12:11:44.838832
15	17	18	1	3	4	CHAL-1783061446041-vrv4wglww	Dghddy	12.00	kg	\N	\N	received	2026-07-03 12:21:06.655408	4	2026-07-03 12:20:46.128074	2026-07-03 12:20:46.128074
16	18	18	1	3	4	CHAL-1783061940778-d393scetk	Sr	14.00	kg	\N	\N	received	2026-07-03 12:29:29.099662	4	2026-07-03 12:29:00.86375	2026-07-03 12:29:00.86375
17	19	21	1	3	4	CHAL-1784104737172-ohrbztkfx	Steel sheet	20.00	kg	\N	\N	received	2026-07-15 14:09:49.632977	4	2026-07-15 14:08:57.176294	2026-07-15 14:08:57.176294
18	20	22	1	3	4	CHAL-1784192515479-erctdh5sv	Steel chair	5.00	pcs	\N	\N	received	2026-07-16 14:32:50.695686	4	2026-07-16 14:31:55.832579	2026-07-16 14:31:55.832579
8	10	16	1	3	4	CHAL-1783050509319-93qoxid3h	Reactor	1.00	Unit	\N	\N	received	2026-07-28 12:27:24.827089	4	2026-07-03 09:18:29.373738	2026-07-03 09:18:29.373738
\.


--
-- Data for Name: external_jobwork_inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.external_jobwork_inventory (id, challan_id, job_work_id, company_id, material_name, quantity, unit, hsn_code, gst_rate, received_quantity, received_date, received_by, status, notes, created_at, updated_at) FROM stdin;
4	4	14	1	Cupboard 	2.00	Unit	232435	5.00	0.00	2026-07-02 08:38:59.869207	4	issued	\N	2026-07-02 08:38:17.05913	2026-07-03 08:44:44.561813
7	9	17	1	Car	1.00	Unit	13242	5.00	0.00	2026-07-03 10:40:58.269425	4	issued	\N	2026-07-03 10:40:24.158511	2026-07-03 10:42:47.848012
8	10	17	1	Sd	2.00	kg	745847	5.00	0.00	2026-07-03 11:43:54.090396	4	issued	\N	2026-07-03 11:43:01.461761	2026-07-03 11:45:25.696986
9	11	17	1	Cbc	12.00	kg	355335	5.00	0.00	2026-07-03 11:51:23.947543	4	issued	\N	2026-07-03 11:50:52.426017	2026-07-03 11:52:54.664564
10	12	17	1	Gdyf	21.00	kg	464545	5.00	0.00	2026-07-03 11:58:07.649528	4	issued	\N	2026-07-03 11:57:39.161751	2026-07-03 11:59:43.798899
11	13	18	1	Clamp	2.00	Unit	123321	5.00	0.00	2026-07-03 12:06:49.580639	4	issued	\N	2026-07-03 12:06:04.798971	2026-07-03 12:08:30.757378
12	14	18	1	Dgdy	12.00	kg	3535	5.00	0.00	2026-07-03 12:12:06.837288	4	issued	\N	2026-07-03 12:11:44.85251	2026-07-03 12:14:21.998229
13	15	18	1	Ffh	12.00	kg	4646	5.00	0.00	2026-07-03 12:21:06.664556	4	issued	\N	2026-07-03 12:20:46.13984	2026-07-03 12:22:22.067355
14	16	18	1	Cg	14.00	kg	7676	5.00	0.00	2026-07-03 12:29:29.105961	4	issued	\N	2026-07-03 12:29:00.882512	2026-07-03 12:30:58.895921
15	17	21	1	Sheet	20.00	kg	2553322	5.00	0.00	2026-07-15 14:09:49.644956	4	issued	\N	2026-07-15 14:08:57.202975	2026-07-15 14:15:01.9132
16	18	22	1	Chair	5.00	pcs	533525	5.00	5.00	2026-07-16 14:32:50.729157	4	received	\N	2026-07-16 14:31:55.877738	2026-07-16 14:31:55.877738
6	8	16	1	Reactor	1.00	Unit	12364	5.00	1.00	2026-07-28 12:27:24.849105	4	received	\N	2026-07-03 09:18:29.382302	2026-07-03 12:40:07.450645
\.


--
-- Data for Name: external_jobwork_material_notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.external_jobwork_material_notifications (id, job_work_id, npd_user_id, accountant_id, company_id, material_description, expected_arrival_date, material_details, status, created_at, updated_at) FROM stdin;
8	14	2	3	1	Cupboard	2026-12-11	{"supplier": "Asd", "po_number": "Fysfs"}	challan_created	2026-07-02 08:27:06.011856	2026-07-02 08:27:06.011856
9	15	2	\N	1	Chair	20261-07-15	{"supplier": "Not specified", "po_number": "N/A"}	pending	2026-07-03 08:47:43.616202	2026-07-03 08:47:43.616202
10	16	2	\N	1	Reactor	2026-10-11	{"supplier": "Akash", "po_number": "N/A"}	pending	2026-07-03 09:17:31.549459	2026-07-03 09:17:31.549459
11	17	2	\N	1	Asd	2026-07-14	{"supplier": "Xyz", "po_number": "N/A"}	pending	2026-07-03 10:39:07.15489	2026-07-03 10:39:07.15489
12	17	2	\N	1	Dff	2026-07-13	{"supplier": "Bfbf", "po_number": "N/A"}	pending	2026-07-03 11:42:27.766421	2026-07-03 11:42:27.766421
13	17	2	\N	1	Dgdg	2026-12-11	{"supplier": "Utfut", "po_number": "N/A"}	pending	2026-07-03 11:50:21.253966	2026-07-03 11:50:21.253966
14	17	2	\N	1	Fdfd	2024-12-11	{"supplier": "Fdbg", "po_number": "N/A"}	pending	2026-07-03 11:57:01.272684	2026-07-03 11:57:01.272684
15	18	2	\N	1	Clamp 	2026-07-11	{"supplier": "Nss", "po_number": "N/A"}	pending	2026-07-03 12:05:01.236209	2026-07-03 12:05:01.236209
16	18	2	\N	1	Dy	2023-12-11	{"supplier": "Vbcb", "po_number": "N/A"}	pending	2026-07-03 12:11:15.837051	2026-07-03 12:11:15.837051
17	18	2	\N	1	Dghddy	2024-12-11	{"supplier": "Gngjg", "po_number": "N/A"}	pending	2026-07-03 12:20:09.966267	2026-07-03 12:20:09.966267
18	18	2	\N	1	Sr	2023-12-11	{"supplier": "Dg", "po_number": "N/A"}	pending	2026-07-03 12:28:35.587715	2026-07-03 12:28:35.587715
19	21	2	\N	1	Steel sheet	2026-06-14	{"supplier": "Not specified", "po_number": "N/A"}	pending	2026-07-15 14:05:45.02715	2026-07-15 14:05:45.02715
20	22	2	\N	1	Steel chair	2026-07-17	{"supplier": "Not specified", "po_number": "N/A"}	pending	2026-07-16 14:30:43.496223	2026-07-16 14:30:43.496223
\.


--
-- Data for Name: external_jobwork_outstock_request_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.external_jobwork_outstock_request_items (id, request_id, material_id, material_name, requested_quantity, unit, available_quantity, created_at) FROM stdin;
1	1	\N	Cupboard 	2.00	Unit	2.00	2026-07-02 13:51:12.702512
2	2	\N	Cupboard 	2.00	Unit	2.00	2026-07-03 08:03:10.141155
3	3	\N	Cupboard 	2.00	Unit	2.00	2026-07-03 08:21:50.389448
4	4	\N	Cupboard 	2.00	Unit	2.00	2026-07-03 08:37:27.134749
5	5	\N	Cupboard 	2.00	Unit	2.00	2026-07-03 08:43:57.369948
6	6	\N	Reactor	1.00	Unit	1.00	2026-07-03 10:03:43.989112
7	7	\N	Car	1.00	Unit	1.00	2026-07-03 10:42:03.185109
8	8	\N	Sd	2.00	kg	2.00	2026-07-03 11:44:49.074501
9	9	\N	Cbc	12.00	kg	12.00	2026-07-03 11:52:16.996497
10	10	\N	Gdyf	21.00	kg	21.00	2026-07-03 11:58:31.833325
11	11	\N	Clamp	2.00	Unit	2.00	2026-07-03 12:07:44.149805
12	12	\N	Dgdy	12.00	kg	12.00	2026-07-03 12:13:19.660165
13	13	\N	Ffh	12.00	kg	12.00	2026-07-03 12:22:00.072949
14	14	\N	Cg	14.00	kg	14.00	2026-07-03 12:30:02.126977
15	15	\N	Reactor	1.00	Unit	1.00	2026-07-03 12:35:02.063188
16	16	\N	Reactor	1.00	Unit	1.00	2026-07-03 12:39:34.468334
17	17	\N	Sheet	20.00	kg	20.00	2026-07-15 14:11:36.705237
18	18	\N	Chair	5.00	pcs	5.00	2026-07-16 14:35:13.550426
\.


--
-- Data for Name: external_jobwork_outstock_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.external_jobwork_outstock_requests (id, project_id, worker_id, requested_by, company_id, request_date, request_notes, status, created_at, updated_at) FROM stdin;
1	14	20	13	1	2026-07-02 13:51:12.670582	\N	collected	2026-07-02 13:51:12.670582	2026-07-03 07:59:04.877571
2	14	20	13	1	2026-07-03 08:03:10.13149	\N	collected	2026-07-03 08:03:10.13149	2026-07-03 08:03:45.153133
3	14	20	13	1	2026-07-03 08:21:50.374129	\N	fulfilled	2026-07-03 08:21:50.374129	2026-07-03 08:22:25.528232
4	14	20	13	1	2026-07-03 08:37:27.128756	\N	fulfilled	2026-07-03 08:37:27.128756	2026-07-03 08:38:11.288222
5	14	20	13	1	2026-07-03 08:43:57.354204	\N	fulfilled	2026-07-03 08:43:57.354204	2026-07-03 08:44:44.545148
6	16	20	13	1	2026-07-03 10:03:43.979994	\N	fulfilled	2026-07-03 10:03:43.979994	2026-07-03 10:19:41.775177
7	17	20	13	1	2026-07-03 10:42:03.180426	\N	fulfilled	2026-07-03 10:42:03.180426	2026-07-03 10:42:47.827319
8	17	20	13	1	2026-07-03 11:44:49.069032	\N	fulfilled	2026-07-03 11:44:49.069032	2026-07-03 11:45:25.67941
9	17	20	13	1	2026-07-03 11:52:16.989052	\N	fulfilled	2026-07-03 11:52:16.989052	2026-07-03 11:52:54.646615
10	17	20	13	1	2026-07-03 11:58:31.8254	\N	fulfilled	2026-07-03 11:58:31.8254	2026-07-03 11:59:43.790666
11	18	20	13	1	2026-07-03 12:07:44.144561	\N	fulfilled	2026-07-03 12:07:44.144561	2026-07-03 12:08:30.748894
12	18	20	13	1	2026-07-03 12:13:19.650805	\N	fulfilled	2026-07-03 12:13:19.650805	2026-07-03 12:14:21.989943
13	18	20	13	1	2026-07-03 12:22:00.05803	\N	fulfilled	2026-07-03 12:22:00.05803	2026-07-03 12:22:22.05992
14	18	20	13	1	2026-07-03 12:30:02.116978	\N	fulfilled	2026-07-03 12:30:02.116978	2026-07-03 12:30:58.884571
15	16	20	13	1	2026-07-03 12:35:02.04967	\N	fulfilled	2026-07-03 12:35:02.04967	2026-07-03 12:36:13.659131
16	18	20	13	1	2026-07-03 12:39:34.465661	\N	fulfilled	2026-07-03 12:39:34.465661	2026-07-03 12:40:07.441824
17	21	20	13	1	2026-07-15 14:11:36.690302	\N	fulfilled	2026-07-15 14:11:36.690302	2026-07-15 14:15:01.877619
18	22	20	13	1	2026-07-16 14:35:13.506859	\N	pending	2026-07-16 14:35:13.506859	2026-07-16 14:35:13.506859
\.


--
-- Data for Name: external_jobwork_outstock_transaction_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.external_jobwork_outstock_transaction_items (id, transaction_id, material_name, issued_quantity, unit, created_at) FROM stdin;
1	1	Gdyf	21.00	kg	2026-07-03 11:59:43.787868
2	2	Clamp	2.00	Unit	2026-07-03 12:08:30.744217
3	3	Dgdy	12.00	kg	2026-07-03 12:14:21.985995
4	4	Ffh	12.00	kg	2026-07-03 12:22:22.055914
5	5	Cg	14.00	kg	2026-07-03 12:30:58.878633
6	6	Reactor	1.00	Unit	2026-07-03 12:36:13.650354
7	7	Reactor	1.00	Unit	2026-07-03 12:40:07.438028
8	8	Sheet	20.00	kg	2026-07-15 14:15:01.86723
\.


--
-- Data for Name: external_jobwork_outstock_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.external_jobwork_outstock_transactions (id, request_id, project_id, worker_id, issued_by, company_id, fulfillment_date, qr_verification_status, qr_scan_time, transaction_notes, created_at) FROM stdin;
1	10	17	20	20	1	2026-07-03 11:59:43.776628	verified	2026-07-03 11:59:43.776628	Collected on 7/3/2026, 11:59:43 AM	2026-07-03 11:59:43.776628
2	11	18	20	20	1	2026-07-03 12:08:30.728758	verified	2026-07-03 12:08:30.728758	Collected on 7/3/2026, 12:08:30 PM	2026-07-03 12:08:30.728758
3	12	18	20	20	1	2026-07-03 12:14:21.968346	verified	2026-07-03 12:14:21.968346	Collected on 7/3/2026, 12:14:21 PM	2026-07-03 12:14:21.968346
4	13	18	20	20	1	2026-07-03 12:22:22.051459	verified	2026-07-03 12:22:22.051459	Collected on 7/3/2026, 12:22:22 PM	2026-07-03 12:22:22.051459
5	14	18	20	20	1	2026-07-03 12:30:58.868741	verified	2026-07-03 12:30:58.868741	Collected on 7/3/2026, 12:30:58 PM	2026-07-03 12:30:58.868741
6	15	16	20	20	1	2026-07-03 12:36:13.633406	verified	2026-07-03 12:36:13.633406	Collected on 7/3/2026, 12:36:13 PM	2026-07-03 12:36:13.633406
7	16	18	20	20	1	2026-07-03 12:40:07.434111	verified	2026-07-03 12:40:07.434111	Collected on 7/3/2026, 12:40:07 PM	2026-07-03 12:40:07.434111
8	17	21	20	20	1	2026-07-15 14:15:01.852671	verified	2026-07-15 14:15:01.852671	Collected on 7/15/2026, 2:15:01 PM	2026-07-15 14:15:01.852671
\.


--
-- Data for Name: external_material_collections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.external_material_collections (id, request_id, collected_by, collection_timestamp, status, created_at) FROM stdin;
1	2	20	2026-07-03 02:33:44.135	completed	2026-07-03 08:03:45.159538
2	3	20	2026-07-03 02:52:24.508	completed	2026-07-03 08:22:25.529962
3	4	20	2026-07-03 03:08:10.256	completed	2026-07-03 08:38:11.293185
4	5	20	2026-07-03 03:14:43.528	completed	2026-07-03 08:44:44.550961
5	6	20	2026-07-03 04:49:40.743	completed	2026-07-03 10:19:41.784043
6	7	20	2026-07-03 05:12:46.775	completed	2026-07-03 10:42:47.83164
7	8	20	2026-07-03 06:15:24.618	completed	2026-07-03 11:45:25.684144
8	9	20	2026-07-03 06:22:53.649	completed	2026-07-03 11:52:54.65315
9	10	20	2026-07-03 06:29:42.633	completed	2026-07-03 11:59:43.792374
10	11	20	2026-07-03 06:38:29.697	completed	2026-07-03 12:08:30.750616
11	12	20	2026-07-03 06:44:20.89	completed	2026-07-03 12:14:21.991285
12	13	20	2026-07-03 06:52:21.018	completed	2026-07-03 12:22:22.061193
13	14	20	2026-07-03 07:00:57.883	completed	2026-07-03 12:30:58.8868
14	15	20	2026-07-03 07:06:12.643	completed	2026-07-03 12:36:13.661062
15	16	20	2026-07-03 07:10:06.444	completed	2026-07-03 12:40:07.443096
16	17	20	2026-07-15 08:45:01.474	completed	2026-07-15 14:15:01.884428
\.


--
-- Data for Name: gst_rates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gst_rates (id, rate, label, is_active, created_at, updated_at) FROM stdin;
1	5.00	GST 5%	t	2026-10-14 04:52:19.082433	2026-10-14 04:52:19.082433
2	18.00	GST 18%	t	2026-10-14 04:52:19.082433	2026-10-14 04:52:19.082433
3	40.00	GST 40%	t	2026-10-14 04:52:19.082433	2026-10-14 04:52:19.082433
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: postgres
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
29	1	Steel	20.00	units	\N	2026-06-17 00:46:43.285962	2026-06-17 00:46:43.285962	2026-06-17 00:46:43.285962
30	1	Plastic	9.00	units	\N	2026-06-17 00:46:43.285962	2026-06-17 00:46:43.285962	2026-06-17 00:46:43.285962
\.


--
-- Data for Name: job_work_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_work_images (id, job_work_id, file_path, file_name) FROM stdin;
5	10	/uploads/jobwork-1781162805783-56996194.jpeg	54f6b0e8-7032-47dd-bc8c-b71a2b84fb8f.jpeg
6	11	/uploads/jobwork-1781162806524-656968337.jpeg	54f6b0e8-7032-47dd-bc8c-b71a2b84fb8f.jpeg
\.


--
-- Data for Name: job_work_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_work_items (id, job_work_id, material_name, hsn, quantity, unit, stock_item_id, unit_value, bom_item_id, revision_bom_item_id, item_kind) FROM stdin;
9	9	Rod	123421	12.00	pcs	25	200.00	\N	\N	stock
10	10	Rod	1221	12.00	pcs	28	200.00	\N	\N	stock
11	11	Rod	1221	12.00	pcs	28	250.00	\N	\N	stock
12	13	Sheet	12342	5.00	pcs	26	140.00	\N	\N	stock
13	14	 Table	122211	15.00	pcs	28	60.00	\N	\N	stock
14	15	Sheet	12112	12.00	pcs	26	240.00	\N	\N	stock
15	16	Steel cupboard 	12321	1.00	pcs	25	200.00	\N	\N	stock
1087	1098	Car	23315	1.00	pcs	175	\N	\N	\N	stock
\.


--
-- Data for Name: job_work_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_work_requests (id, job_id, project_id, company_id, job_work_type, purpose, loaded_vehicle_weight, unloaded_vehicle_weight, actual_vehicle_weight, accountant_id, created_by, created_at, challan_file_path, challan_file_name, vendor_email, status, store_incharge_id, vehicle_no) FROM stdin;
1098	JW-2026-0008	19	1	Laser Cutting	\N	\N	\N	\N	\N	13	2026-10-14 10:18:35.69792	\N	\N	\N	pending	4	\N
14	JW-2026-0005	13	1	Laser Cutting	\N	3580.00	1600.00	1980.00	3	13	2026-06-11 22:05:57.352973	/uploads/jobwork-1781635137068-181175977.jpg	Screenshot_20260612_000811_Expo%20Go.jpg	\N	closed	4	\N
15	JW-2026-0006	13	1	Laser Cutting	\N	4500.00	3600.00	900.00	3	13	2026-06-11 23:48:01.909269	/uploads/jobwork-1781201969867-887281416.pdf	bct_ia_2.pdf	\N	closed	4	KA50EH8187
16	JW-2026-0007	13	1	Others	Coloring	2000.00	1800.00	200.00	3	13	2026-06-17 00:12:43.62992	/uploads/jobwork-1781635528999-54721411.jpg	Screenshot_20260612_000811_Expo%20Go.jpg	\N	closed	4	KA02AS3421
9	JW-2026-0001	11	1	Galvanizing	\N	5000.00	3500.00	1500.00	3	13	2026-06-11 12:09:55.971706	/uploads/jobwork-1781160063197-70300964.pdf	Blockchain-2026.pdf	\N	closed	4	\N
10	JW-2026-0002	13	1	Laser Cutting	\N	5000.00	3500.00	1500.00	3	13	2026-06-11 12:56:46.710112	/uploads/jobwork-1781200304528-993995965.jpg	Screenshot_20260611_220648_Expo%20Go.jpg	\N	closed	4	\N
11	JW-2026-0003	13	1	Laser Cutting	\N	5000.00	3500.00	1500.00	3	13	2026-06-11 12:56:48.169286	/uploads/jobwork-1781200492783-298428538.jpg	IMG-20260529-WA0009.jpg	\N	closed	4	\N
13	JW-2026-0004	13	1	Laser Cutting	\N	6000.00	1500.00	4500.00	3	13	2026-06-11 21:58:07.373263	/uploads/jobwork-1781635207201-345291959.jpg	IMG-20260604-WA0009.jpg	\N	closed	4	\N
\.


--
-- Data for Name: jobwork_dc_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jobwork_dc_items (id, dc_id, job_work_item_id, stock_item_id, description, hsn_code, quantity, unit, unit_value, total_value, returned_quantity, created_at) FROM stdin;
261	246	13	28	 Table	1221	15.000	pcs	60.00	900.00	15.000	2026-10-14 06:23:43.97412
263	246	15	25	Steel cupboard 	123421	1.000	pcs	200.00	200.00	1.000	2026-10-14 06:23:43.97412
262	246	14	26	Sheet	12342	12.000	pcs	240.00	2880.00	12.000	2026-10-14 06:23:43.97412
257	245	9	25	Rod	123421	12.000	pcs	200.00	2400.00	12.000	2026-10-14 06:15:31.331971
258	245	10	28	Rod	1221	12.000	pcs	200.00	2400.00	12.000	2026-10-14 06:15:31.331971
259	245	11	28	Rod	1221	12.000	pcs	250.00	3000.00	12.000	2026-10-14 06:15:31.331971
260	245	12	26	Sheet	12342	5.000	pcs	140.00	700.00	5.000	2026-10-14 06:15:31.331971
\.


--
-- Data for Name: jobwork_dc_movements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jobwork_dc_movements (id, dc_id, from_vendor_id, to_vendor_id, vendor_dc_no, moved_at, note, created_by, created_at) FROM stdin;
13	246	42	41	\N	2026-10-14 06:26:46.984228	\N	4	2026-10-14 06:26:46.984228
14	245	1	42	\N	2026-10-14 06:31:34.819723	\N	4	2026-10-14 06:31:34.819723
\.


--
-- Data for Name: jobwork_dcs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jobwork_dcs (id, company_id, dc_number, dc_date, vendor_id, vendor_name, vendor_gstin, vendor_address, process, vehicle_number, loaded_vehicle_weight, unloaded_vehicle_weight, eway_bill_no, current_location_vendor_id, status, created_by, approved_by, approved_at, rejection_reason, dispatched_at, closed_at, attachment_path, attachment_name, created_at, updated_at) FROM stdin;
246	1	SE/DC/0002	2026-10-14	42	DEV Vendor - Chennai (Tamil Nadu)	33DDDDD3333D1Z5	Ambattur Industrial Estate, Chennai, Tamil Nadu, 600058	Ss	KA23AS3442	1200.00	850.00	112547888777	\N	closed	4	3	2026-10-14 06:24:59.632975	\N	2026-10-14 06:26:01.881256	2026-10-14 06:31:19.733532	\N	\N	2026-10-14 06:23:43.97412	2026-10-14 06:31:19.733532
245	1	SE/DC/0001	2026-10-14	1	Gaurav	29BBBBB1111B1Z5	Fgdfjr6ujey, Karnataka	Shot blasting	KA50EB3421	1400.00	1250.00	\N	\N	closed	4	3	2026-10-14 06:18:59.442584	\N	2026-10-14 06:27:15.080162	2026-10-14 06:31:47.71968	/uploads/jobwork-dc-1791938731482-820720162.pdf	ClinicalNote_Rishabh_Discharge_Summary.pdf	2026-10-14 06:15:31.331971	2026-10-14 06:31:47.71968
\.


--
-- Data for Name: jobwork_return_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jobwork_return_items (id, return_id, dc_item_id, quantity_received) FROM stdin;
61	78	261	15.000
62	78	262	10.000
63	78	263	1.000
64	79	262	2.000
65	80	257	12.000
66	80	258	12.000
67	80	259	12.000
68	80	260	5.000
\.


--
-- Data for Name: jobwork_returns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jobwork_returns (id, dc_id, vendor_id, vendor_dc_no, vendor_dc_date, invoice_no, invoice_date, job_charge, sac_code, gst_rate_id, gst_amount, total, received_by, received_at, created_at, cgst_amount, sgst_amount, igst_amount, entry_type) FROM stdin;
77	245	1	\N	2026-12-11	455543322222222	2026-12-11	20570.00	\N	2	3702.60	24272.60	4	2026-10-14 06:29:08.413165	2026-10-14 06:29:08.413165	1851.30	1851.30	0.00	invoice_only
78	246	41	\N	\N	\N	\N	0.00	\N	\N	0.00	0.00	4	2026-10-14 06:31:09.138448	2026-10-14 06:31:09.138448	0.00	0.00	0.00	return
79	246	41	\N	\N	\N	\N	0.00	\N	\N	0.00	0.00	4	2026-10-14 06:31:19.733532	2026-10-14 06:31:19.733532	0.00	0.00	0.00	return
80	245	42	\N	\N	\N	\N	0.00	\N	\N	0.00	0.00	4	2026-10-14 06:31:47.71968	2026-10-14 06:31:47.71968	0.00	0.00	0.00	return
\.


--
-- Data for Name: major_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.major_orders (id, company_id, materials_detail_id, vendor_id, item_name, hsn, quantity, unit, unit_price, total_price, status, order_date, expected_delivery_date, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: master_materials; Type: TABLE DATA; Schema: public; Owner: postgres
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
-- Data for Name: master_vendors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.master_vendors (id, name, email, phone_number, address, created_at, updated_at, company_id, vendor_type, gst_number, pan_number, opening_balance, credit_period, currency, state, country, pincode, bank_name, account_number, ifsc_code, branch_name, account_holder_name, upi_id) FROM stdin;
2	Mansa	miapp@gmail.com	1236548970	Vsksmshms	2026-04-09 22:42:48.538861	2026-04-09 22:42:48.538861	2	\N	\N	\N	0.00	\N	INR	\N	\N	\N	\N	\N	\N	\N	\N	\N
3	Raju s	r@gmail.com	3685986883	 Sbsmsj cm	2026-04-09 22:42:48.54239	2026-04-09 22:42:48.54239	2	\N	\N	\N	0.00	\N	INR	\N	\N	\N	\N	\N	\N	\N	\N	\N
4	XYZ	patilakshata758@gmail.com	8660363145	Bengaluru 	2026-04-30 19:12:37.233136	2026-04-30 19:12:46.143414	3	\N	\N	\N	0.00	\N	INR	\N	\N	\N	\N	\N	\N	\N	\N	\N
5	ABC	app@gmail.com	9652354825	Bengaluru 	2026-04-30 19:13:31.262073	2026-04-30 19:13:31.262073	3	\N	\N	\N	0.00	\N	INR	\N	\N	\N	\N	\N	\N	\N	\N	\N
1	Gaurav	gk@gmail.com	8651789625	Fgdfjr6ujey	2026-02-26 01:35:00.558497	2026-05-23 07:12:14.347555	1	Sundry Creditors	29BBBBB1111B1Z5		0.00		INR	Karnataka								
41	DEV Vendor - Bengaluru (Karnataka)	\N	\N	Peenya Industrial Area, Bengaluru	2026-10-14 05:41:27.57262	2026-10-14 05:41:27.57262	1	\N	29CCCCC2222C1Z5	\N	0.00	\N	INR	Karnataka	\N	560058	\N	\N	\N	\N	\N	\N
42	DEV Vendor - Chennai (Tamil Nadu)	\N	\N	Ambattur Industrial Estate, Chennai	2026-10-14 05:41:27.57262	2026-10-14 05:41:27.57262	1	\N	33DDDDD3333D1Z5	\N	0.00	\N	INR	Tamil Nadu	\N	600058	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: material_usage_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.material_usage_reports (id, project_id, project_name, sent_by, sent_by_name, accountant_id, accountant_name, materials, notes, status, created_at, updated_at) FROM stdin;
1	21	POEN00181.7151413121110888e+21	13	Sanjeev	3	Ravish 	[{"hsn": null, "unit": "pcs", "gst_rate": 18, "base_price": 0, "gst_amount": 0, "unit_price": 0, "total_price": 0, "material_name": "Steel", "quantity_used": 12, "estimated_cost": null}]	\N	pending	2026-07-15 14:35:27.834541	2026-07-15 14:35:27.834541
\.


--
-- Data for Name: materials_detail; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.materials_detail (id, company_id, demand_id, demand_item_id, bid_id, vendor_id, item_name, quantity, unit, hsn, unit_price, total_price, supply_until_date, vendor_name, vendor_gstin, status, notes, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: minor_order_bids; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.minor_order_bids (id, minor_order_id, vendor_id, unit_price, total_price, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: minor_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.minor_orders (id, company_id, item_name, hsn, quantity, unit, deadline_date, status, selected_vendor_id, selected_bid_id, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, title, message, type, is_read, created_at, project_id, data) FROM stdin;
1	1	New Employee Signup	Raghu (npd) has requested to join your company and needs approval.	employee_signup	t	2026-02-04 02:18:21.23624	\N	\N
3	2	New Enquiry Assigned	Enquiry EN0001 has been assigned to you for review. File: BCS702-module-3-textbook.pdf	enquiry_assigned	t	2026-02-04 03:20:56.722585	\N	\N
2	2	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	t	2026-02-04 02:41:11.102132	\N	\N
5	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0001. Remarks: Go	quotation_review	t	2026-02-05 01:38:08.201631	\N	\N
7	2	Customer Decision Recorded	Customer final decision for enquiry EN0001: accepted by customer. 	customer_decision	f	2026-02-12 23:52:34.620406	\N	\N
9	2	Customer Decision Recorded	Customer final decision for enquiry EN0001: accepted by customer. 	customer_decision	t	2026-02-13 00:01:47.150744	\N	\N
8	2	New Project Created	A new project Project EN0001 has been auto-created for enquiry EN0001 after PO upload.	project_created	t	2026-02-13 00:01:47.106401	1	\N
6	2	PO Uploaded	A Purchase Order has been uploaded for enquiry EN0001.	po_uploaded	t	2026-02-12 23:52:34.58851	\N	\N
13	4	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	t	2026-02-28 01:55:57.706954	\N	\N
14	2	New Enquiry Assigned	Enquiry EN0002 has been assigned to you for review. File: GST%20Management%20ERP%20System%20(2).pdf	enquiry_assigned	f	2026-03-14 11:57:30.456317	\N	\N
15	2	New Enquiry Assigned	Enquiry EN0003 has been assigned to you for review. File: BCS702-module-3-textbook-6.pdf	enquiry_assigned	f	2026-03-14 11:57:48.74668	\N	\N
16	1	Quotation Uploaded	A quotation has been uploaded for enquiry EN0003 by NPD user undefined.	quotation_uploaded	t	2026-03-14 11:59:47.722428	\N	\N
17	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0003. Remarks: Go	quotation_review	f	2026-03-14 12:00:34.449665	\N	\N
19	3	Partial Order Receipt	Order SE000000014 has been partially received and requires your review for pricing/GST.	info	t	2026-03-16 02:10:33.829937	\N	\N
25	2	New Enquiry Assigned	Enquiry EN0004 has been assigned to you for review. File: 1773340542017.pdf	enquiry_assigned	f	2026-03-16 14:48:00.126121	\N	\N
27	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0004. Remarks: Go ahead	quotation_review	f	2026-03-16 14:50:35.779318	\N	\N
26	1	Quotation Uploaded	A quotation has been uploaded for enquiry EN0004 by NPD user undefined.	quotation_uploaded	t	2026-03-16 14:49:15.056059	\N	\N
12	1	New Employee Signup	Ankit (store_incharge) has requested to join your company and needs approval.	employee_signup	t	2026-02-28 01:55:34.690351	\N	\N
10	1	New Employee Signup	Ravish  (accountant) has requested to join your company and needs approval.	employee_signup	t	2026-02-26 00:52:57.730393	\N	\N
4	1	Quotation Uploaded	A quotation has been uploaded for enquiry EN0001 by NPD user undefined.	quotation_uploaded	t	2026-02-05 01:26:03.473985	\N	\N
22	3	Partial Order Receipt	Order SE000000013 has been partially received and requires your review for pricing/GST.	info	t	2026-03-16 13:09:05.854698	\N	\N
23	3	Partial Order Receipt	Order SE000000018 has been partially received and requires your review for pricing/GST.	info	t	2026-03-16 13:12:05.115868	\N	\N
21	3	Partial Order Receipt	Order SE000000013 has been partially received and requires your review for pricing/GST.	info	t	2026-03-16 12:53:03.539186	\N	\N
20	3	Order Fully Received	Order SE000000014 has been fully received and requires your review for pricing/GST.	info	t	2026-03-16 12:51:40.259483	\N	\N
18	3	Order Fully Received	Order SE000000017 has been fully received and requires your review for pricing/GST.	info	t	2026-03-16 02:06:11.05926	\N	\N
24	3	Partial Order Receipt	Order SE000000018 has been partially received and requires your review for pricing/GST.	info	t	2026-03-16 13:16:02.15597	\N	\N
28	3	Order Fully Received	Order SE000000019 has been fully received and requires your review for pricing/GST.	info	t	2026-03-16 15:57:18.759996	\N	\N
11	3	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	t	2026-02-26 00:53:38.785546	\N	\N
29	2	New Enquiry Assigned	Enquiry EN0005 has been assigned to you for review. File: Module-2-updated.pdf	enquiry_assigned	f	2026-04-09 21:35:42.42759	\N	\N
30	1	Quotation Uploaded	A quotation has been uploaded for enquiry EN0005 by NPD user undefined.	quotation_uploaded	f	2026-04-09 21:39:56.106946	\N	\N
31	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0005. Remarks: Go ahead	quotation_review	f	2026-04-09 21:40:59.684504	\N	\N
32	2	New Project Created	A new project PO0000000001 has been auto-created for enquiry EN0005 after PO upload.	project_created	f	2026-04-09 21:48:06.141484	2	\N
33	2	Customer Decision Recorded	Customer final decision for enquiry EN0005: accepted by customer. 	customer_decision	f	2026-04-09 21:48:06.17989	\N	\N
34	5	New Employee Signup	Aakash (npd) has requested to join your company and needs approval.	employee_signup	f	2026-04-09 22:20:25.909316	\N	\N
36	5	New Employee Signup	Koustav (accountant) has requested to join your company and needs approval.	employee_signup	f	2026-04-09 22:22:13.140579	\N	\N
38	5	New Employee Signup	Jyothi (store_incharge) has requested to join your company and needs approval.	employee_signup	f	2026-04-09 22:23:13.880538	\N	\N
39	8	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	f	2026-04-09 22:23:24.75879	\N	\N
40	6	New Enquiry Assigned	Enquiry EN0001 has been assigned to you for review. File: AdmitCard-260311264917.pdf	enquiry_assigned	t	2026-04-09 22:25:09.964768	\N	\N
41	5	Quotation Uploaded	A quotation has been uploaded for enquiry EN0001 by NPD user undefined.	quotation_uploaded	f	2026-04-09 22:25:35.017877	\N	\N
37	7	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	t	2026-04-09 22:22:21.070919	\N	\N
45	7	Partial Order Receipt	Order SE000000021 has been partially received and requires your review for pricing/GST.	info	f	2026-04-10 01:56:22.864402	\N	\N
47	5	Quotation Uploaded	A quotation has been uploaded for enquiry EN0002 by NPD user undefined.	quotation_uploaded	t	2026-04-10 02:24:42.510464	\N	\N
46	6	New Enquiry Assigned	Enquiry EN0002 has been assigned to you for review. File: wc_1ve23cs082.pdf	enquiry_assigned	t	2026-04-10 02:23:58.346913	\N	\N
44	6	Customer Decision Recorded	Customer final decision for enquiry EN0001: accepted by customer. Remarks: Gjd	customer_decision	t	2026-04-09 22:26:30.638706	\N	\N
43	6	New Project Created	A new project PO0000000002 has been auto-created for enquiry EN0001 after PO upload.	project_created	t	2026-04-09 22:26:30.623355	3	\N
42	6	Quotation Accepted	Management has accepted your quotation for enquiry EN0001. Remarks: Nice	quotation_review	t	2026-04-09 22:25:43.447133	\N	\N
35	6	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	t	2026-04-09 22:21:26.945071	\N	\N
48	6	Quotation Accepted	Management has accepted your quotation for enquiry EN0002. Remarks: Fine, works for us	quotation_review	f	2026-04-10 02:26:12.745659	\N	\N
49	6	New Project Created	A new project POEN000210002 has been auto-created for enquiry EN0002 after PO upload.	project_created	f	2026-04-10 02:26:52.696583	4	\N
50	6	Customer Decision Recorded	Customer final decision for enquiry EN0002: accepted by customer. 	customer_decision	f	2026-04-10 02:26:52.752741	\N	\N
51	7	New Requirement Received	New requirement "Requirements for Project ID: 4" received.	requirement_received	f	2026-04-10 02:36:05.505425	4	\N
52	7	New Requirements Received	You have received new requirements: Requirements for Project ID: 4 	info	t	2026-04-10 02:36:05.506654	4	\N
53	7	Order Fully Received	Order SE000000021 has been fully received and requires your review for pricing/GST.	info	f	2026-04-10 02:47:12.518003	\N	\N
54	7	Partial Order Receipt	Order SE000000023 has been partially received and requires your review for pricing/GST.	info	f	2026-04-10 02:49:48.202828	\N	\N
55	6	New Enquiry Assigned	Enquiry EN0003 has been assigned to you for review. File: wc_1ve23cs082.pdf	enquiry_assigned	f	2026-04-10 12:28:26.134709	\N	\N
56	5	Quotation Uploaded	A quotation has been uploaded for enquiry EN0003 by NPD user undefined.	quotation_uploaded	f	2026-04-10 12:28:46.067179	\N	\N
57	6	Quotation Accepted	Management has accepted your quotation for enquiry EN0003. Remarks: Go	quotation_review	f	2026-04-10 12:29:19.521303	\N	\N
58	6	New Project Created	A new project POEN0003210003 has been auto-created for enquiry EN0003 after PO upload.	project_created	f	2026-04-10 12:30:16.984911	5	\N
60	7	New Requirement Received	New requirement "Requirements for Project ID: 5" received.	requirement_received	f	2026-04-10 12:33:16.669665	5	\N
61	7	New Requirements Received	You have received new requirements: Requirements for Project ID: 5 	info	f	2026-04-10 12:33:16.671828	5	\N
59	6	Customer Decision Recorded	Customer final decision for enquiry EN0003: accepted by customer. 	customer_decision	t	2026-04-10 12:30:17.031448	\N	\N
63	9	New Employee Signup	Bhavana (store_incharge) has requested to join your company and needs approval.	employee_signup	t	2026-04-29 18:47:44.688101	\N	\N
65	12	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	t	2026-04-29 18:55:22.71462	\N	\N
62	9	New Employee Signup	Arya (accountant) has requested to join your company and needs approval.	employee_signup	t	2026-04-29 18:44:07.962897	\N	\N
69	9	Quotation Uploaded	A quotation has been uploaded for enquiry EN0001 by NPD user undefined.	quotation_uploaded	t	2026-04-29 19:07:15.999377	\N	\N
64	9	New Employee Signup	Koustav  (npd) has requested to join your company and needs approval.	employee_signup	t	2026-04-29 18:54:45.313812	\N	\N
70	12	Quotation Accepted	Management has accepted your quotation for enquiry EN0001. 	quotation_review	t	2026-04-29 19:12:08.134737	\N	\N
68	12	New Enquiry Assigned	Enquiry EN0001 has been assigned to you for review. File: GST%20Management%20ERP%20System%20(1).pdf	enquiry_assigned	t	2026-04-29 19:04:23.607819	\N	\N
71	12	New Project Created	A new project POEN00010001 has been auto-created for enquiry EN0001 after PO upload.	project_created	f	2026-04-29 19:21:09.10269	6	\N
72	12	Customer Decision Recorded	Customer final decision for enquiry EN0001: accepted by customer. 	customer_decision	f	2026-04-29 19:21:09.155204	\N	\N
74	12	Project Status Updated	Project "POEN00010001" status updated to: IN PROGRESS	status_update	f	2026-04-29 19:26:37.956521	6	\N
76	12	Project Status Updated	Project "POEN00010001" status updated to: PENDING	status_update	f	2026-04-29 19:26:42.061371	6	\N
78	12	Project Status Updated	Project "POEN00010001" status updated to: IN PROGRESS	status_update	f	2026-04-29 19:26:45.596562	6	\N
79	10	New Requirement Received	New requirement "Requirements for Project ID: 6" received.	requirement_received	t	2026-04-30 18:45:54.877271	6	\N
80	10	New Requirements Received	You have received new requirements: Requirements for Project ID: 6 	info	t	2026-04-30 18:45:54.879629	6	\N
81	12	Requirement Status Updated	Requirement "Requirements for Project ID: 6" status updated to: REVIEWED	requirement_status	t	2026-04-30 18:47:26.53898	6	\N
67	10	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	t	2026-04-29 18:55:29.320552	\N	\N
82	12	Requirement Status Updated	Requirement "Requirements for Project ID: 6" status updated to: FULFILLED	requirement_status	f	2026-04-30 18:51:26.02034	6	\N
66	11	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	t	2026-04-29 18:55:26.398125	\N	\N
77	9	Project Status Updated	Project "POEN00010001" status updated to: IN PROGRESS	status_update	t	2026-04-29 19:26:45.594453	6	\N
75	9	Project Status Updated	Project "POEN00010001" status updated to: PENDING	status_update	t	2026-04-29 19:26:42.059695	6	\N
73	9	Project Status Updated	Project "POEN00010001" status updated to: IN PROGRESS	status_update	t	2026-04-29 19:26:37.954115	6	\N
83	10	Order Fully Received	Order SE000000025 has been fully received and requires your review for pricing/GST.	info	f	2026-04-30 19:29:25.751725	\N	\N
84	12	New Enquiry Assigned	Enquiry EN0002 has been assigned to you for review. File: 1510261.pdf	enquiry_assigned	f	2026-05-07 19:17:22.891938	\N	\N
86	12	Quotation Accepted	Management has accepted your quotation for enquiry EN0002. 	quotation_review	f	2026-05-07 19:18:43.709715	\N	\N
87	12	Customer Decision Recorded	Customer final decision for enquiry EN0002: accepted by customer. 	customer_decision	f	2026-05-07 19:19:54.382671	\N	\N
85	9	Quotation Uploaded	A quotation has been uploaded for enquiry EN0002 by NPD user undefined.	quotation_uploaded	t	2026-05-07 19:18:13.974221	\N	\N
88	12	New Project Created	A new project POEN000210002 has been auto-created for enquiry EN0002 after PO upload.	project_created	f	2026-05-07 19:24:43.681523	7	\N
89	12	Customer Decision Recorded	Customer final decision for enquiry EN0002: accepted by customer. 	customer_decision	f	2026-05-07 19:24:43.725407	\N	\N
90	9	Project Status Updated	Project "POEN000210002" status updated to: IN PROGRESS	status_update	f	2026-05-07 19:27:17.761543	7	\N
91	12	Project Status Updated	Project "POEN000210002" status updated to: IN PROGRESS	status_update	f	2026-05-07 19:27:17.762466	7	\N
92	9	Project Status Updated	Project "POEN000210002" status updated to: PENDING	status_update	f	2026-05-07 19:27:20.959122	7	\N
93	12	Project Status Updated	Project "POEN000210002" status updated to: PENDING	status_update	f	2026-05-07 19:27:20.959962	7	\N
94	3	Order Fully Received	Order SE000000026 has been fully received and requires your review for pricing/GST.	info	f	2026-05-23 02:37:24.285132	\N	\N
95	1	New Employee Signup	Sanjeev (project_manager) has requested to join your company and needs approval.	employee_signup	f	2026-05-23 07:24:33.591956	\N	\N
96	13	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	f	2026-05-23 07:24:57.590675	\N	\N
97	14	New Employee Signup	John PM (project_manager) has requested to join your company and needs approval.	employee_signup	f	2026-05-23 07:28:02.488883	\N	\N
98	14	New Employee Signup	Bob Worker (worker) has requested to join your company and needs approval.	employee_signup	f	2026-05-23 07:28:02.557832	\N	\N
99	17	New Employee Signup	John PM (project_manager) has requested to join your company and needs approval.	employee_signup	f	2026-05-23 07:28:49.486863	\N	\N
100	17	New Employee Signup	Bob Worker (worker) has requested to join your company and needs approval.	employee_signup	f	2026-05-23 07:28:49.552467	\N	\N
101	18	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	f	2026-05-23 07:28:49.561599	\N	\N
102	19	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	f	2026-05-23 07:28:49.566487	\N	\N
103	1	New Employee Signup	Deepak (worker) has requested to join your company and needs approval.	employee_signup	f	2026-05-23 07:29:56.383683	\N	\N
104	20	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	f	2026-05-23 07:30:23.525093	\N	\N
105	13	Project Assignment Update	You have been assigned to project: PO-EN0001-7598	project_assignment	f	2026-05-23 07:31:45.720195	1	\N
106	13	Project Assignment Update	You have been assigned to project: PO0000000001	project_assignment	f	2026-05-23 07:31:51.138941	2	\N
107	4	New Stock Request	New stock request for project PO0000000001	stock_request	f	2026-05-23 07:42:44.062747	2	\N
108	20	Stock Allocated	Stock allocated for project PO0000000001.Please scan QR to confirm.	allocation	f	2026-05-23 07:53:45.144631	2	\N
109	4	New Stock Request	New stock request for project PO-EN0001-7598	stock_request	f	2026-05-23 08:14:50.377369	1	\N
110	20	Stock Allocated	Stock allocated for project PO-EN0001-7598.Please scan QR to confirm.	allocation	f	2026-05-23 08:15:21.645076	1	\N
111	1	New Employee Signup	Shivam (worker) has requested to join your company and needs approval.	employee_signup	f	2026-05-23 08:28:07.830733	\N	\N
112	21	Account Approved	Your account has been approved by management. You can now login to the system.	account_approved	f	2026-05-23 08:28:39.060536	\N	\N
114	13	Materials Collected	Worker Deepak has successfully collected items for project "PO0000000001".	collection	f	2026-05-23 08:31:39.092486	2	\N
115	13	Materials Collected	Worker Deepak has successfully collected items for project "PO-EN0001-7598".	collection	f	2026-05-23 08:32:21.343304	1	\N
116	4	New Stock Request	New stock request for project PO-EN0001-7598	stock_request	f	2026-05-23 09:59:55.075058	1	\N
117	20	Stock Allocated	Stock allocated for project PO-EN0001-7598.Please scan QR to confirm.	allocation	f	2026-05-23 10:00:38.482067	1	\N
118	13	Materials Collected	Worker Deepak has successfully collected items for project "PO-EN0001-7598".	collection	f	2026-05-23 10:02:30.673271	1	\N
119	2	New Enquiry Assigned	Enquiry EN0006 has been assigned to you for review. File: final_mine.pdf	enquiry_assigned	f	2026-05-23 11:51:12.813331	\N	\N
120	1	Quotation Uploaded	A quotation has been uploaded for enquiry EN0006 by NPD user undefined.	quotation_uploaded	f	2026-05-23 11:52:38.431698	\N	\N
121	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0006. 	quotation_review	f	2026-05-23 11:53:19.439056	\N	\N
122	2	Customer Decision Recorded	Customer final decision for enquiry EN0006: rejected by customer. 	customer_decision	f	2026-05-23 11:54:05.658041	\N	\N
123	2	Customer Decision Recorded	Customer final decision for enquiry EN0006: accepted by customer. 	customer_decision	f	2026-05-23 11:54:09.704071	\N	\N
124	2	New Project Created	A new project POEN00060002 has been auto-created for enquiry EN0006 after PO upload.	project_created	f	2026-05-23 11:54:27.277522	10	\N
125	2	Customer Decision Recorded	Customer final decision for enquiry EN0006: accepted by customer. 	customer_decision	f	2026-05-23 11:54:27.30654	\N	\N
126	13	Project Assignment Update	You have been assigned to project: POEN00060002	project_assignment	f	2026-05-23 11:54:47.719409	10	\N
127	4	New Stock Request	New stock request for project POEN00060002	stock_request	f	2026-05-23 12:05:18.504982	10	\N
128	21	Stock Allocated	Stock allocated for project POEN00060002.Please scan QR to confirm.	allocation	f	2026-05-23 12:07:46.534979	10	\N
129	13	Materials Collected	Worker Shivam has successfully collected items for project "POEN00060002".	collection	f	2026-05-23 12:09:42.1432	10	\N
130	4	New Stock Request	New stock request for project POEN00060002	stock_request	f	2026-05-23 12:11:39.903629	10	\N
131	4	New Stock Request	New stock request for project POEN00060002	stock_request	f	2026-05-23 12:11:52.031745	10	\N
132	20	Stock Allocated	Stock allocated for project POEN00060002.Please scan QR to confirm.	allocation	f	2026-05-23 12:13:05.245503	10	\N
133	21	Stock Allocated	Stock allocated for project POEN00060002.Please scan QR to confirm.	allocation	f	2026-05-23 12:13:26.869411	10	\N
134	13	Materials Collected	Worker Shivam has successfully collected items for project "POEN00060002".	collection	f	2026-05-23 12:14:03.282229	10	\N
135	2	New Enquiry Assigned	Enquiry EN0007 has been assigned to you for review. File: PO_EN0006_Gmail%2520-%2520TCS%2520NQT%2520All%2520India%2520batch%25202026%2520_%252021st%2520May%25202026.PDF	enquiry_assigned	f	2026-05-23 12:23:16.032818	\N	\N
136	1	Quotation Uploaded	A quotation has been uploaded for enquiry EN0007 by NPD user undefined.	quotation_uploaded	f	2026-05-23 12:24:46.454073	\N	\N
137	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0007. 	quotation_review	f	2026-05-23 12:25:20.584291	\N	\N
138	2	New Project Created	A new project POEN000760003 has been auto-created for enquiry EN0007 after PO upload.	project_created	f	2026-05-23 12:25:34.062786	11	\N
139	2	Customer Decision Recorded	Customer final decision for enquiry EN0007: accepted by customer. 	customer_decision	f	2026-05-23 12:25:34.085445	\N	\N
140	13	Project Assignment Update	You have been assigned to project: POEN000760003	project_assignment	f	2026-05-23 12:26:51.707665	11	\N
141	2	New Enquiry Assigned	Enquiry EN0008 has been assigned to you for review. File: 1VE23CS100_CSE.pdf	enquiry_assigned	f	2026-06-11 12:39:40.704249	\N	\N
142	1	Quotation Uploaded	A quotation has been uploaded for enquiry EN0008 by NPD user undefined.	quotation_uploaded	f	2026-06-11 12:40:32.241407	\N	\N
143	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0008. 	quotation_review	f	2026-06-11 12:42:43.469311	\N	\N
144	2	New Project Created	A new project POEN0008760004 has been auto-created for enquiry EN0008 after PO upload.	project_created	f	2026-06-11 12:43:48.699044	12	\N
145	2	New Project Created	A new project POEN00088760005 has been auto-created for enquiry EN0008 after PO upload.	project_created	f	2026-06-11 12:46:00.338899	13	\N
146	2	Customer Decision Recorded	Customer final decision for enquiry EN0008: accepted by customer. 	customer_decision	f	2026-06-11 12:46:00.484856	\N	\N
147	3	New Requirement Received	New requirement "Requirements for Project ID: 13" received.	requirement_received	f	2026-06-11 12:52:09.868476	13	\N
148	3	New Requirements Received	You have received new requirements: Requirements for Project ID: 13 	info	f	2026-06-11 12:52:09.875405	13	\N
149	13	Project Assignment Update	You have been assigned to project: POEN00088760005	project_assignment	f	2026-06-11 12:52:33.85041	13	\N
150	2	New Enquiry Assigned	Enquiry EN0009 has been assigned to you for review. File: Cryptography%20and%20network%20security-%20BCS703.pdf	enquiry_assigned	f	2026-06-12 02:43:17.433337	\N	\N
151	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0009. 	quotation_review	f	2026-06-12 02:43:22.880534	\N	\N
152	2	Customer Decision Recorded	Customer final decision for enquiry EN0009: accepted by customer. 	customer_decision	f	2026-06-12 02:43:33.820983	\N	\N
153	2	Customer Decision Recorded	Customer final decision for enquiry EN0009: accepted by customer. 	customer_decision	f	2026-06-12 02:51:44.412068	\N	\N
154	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0009. 	quotation_review	f	2026-06-12 02:52:46.524477	\N	\N
155	2	Customer Decision Recorded	Customer final decision for enquiry EN0009: accepted by customer. 	customer_decision	f	2026-06-12 02:53:57.653086	\N	\N
156	4	New Stock Request	New stock request for project POEN00088760005	stock_request	f	2026-06-17 00:13:47.303993	13	\N
157	2	New Enquiry Assigned	Enquiry EN0010 has been assigned to you for review. File: Cryptography%20and%20network%20security-%20BCS703.pdf	enquiry_assigned	f	2026-06-17 00:18:02.16806	\N	\N
158	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0010. 	quotation_review	f	2026-06-17 00:18:07.12993	\N	\N
159	2	New External Job Work Created	A new external job work POEN001088760006 has been auto-created for enquiry EN0010 after PO upload.	project_created	f	2026-06-17 00:18:22.958722	14	\N
160	2	Customer Decision Recorded	Customer final decision for enquiry EN0010: accepted by customer. 	customer_decision	f	2026-06-17 00:18:22.992847	\N	\N
161	13	Project Assignment Update	You have been assigned to project: POEN001088760006	project_assignment	f	2026-06-17 00:19:25.325684	14	\N
162	3	Partial Order Receipt	Order SE000000027 has been partially received and requires your review for pricing/GST.	info	f	2026-06-17 00:46:43.285962	\N	\N
163	2	New Enquiry Assigned	Enquiry EN0011 has been assigned to you for review. File: Nemotron3Ultra_Free_Setup_Guide_TechwithNandini.pdf	enquiry_assigned	f	2026-07-01 20:38:38.304543	\N	\N
164	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0011. 	quotation_review	f	2026-07-01 20:38:44.972181	\N	\N
165	2	New External Job Work Created	A new external job work POEN00111088760007 has been auto-created for enquiry EN0011 after PO upload.	project_created	f	2026-07-01 20:39:03.433367	15	\N
166	2	Customer Decision Recorded	Customer final decision for enquiry EN0011: accepted by customer. 	customer_decision	f	2026-07-01 20:39:03.456742	\N	\N
167	13	Project Assignment Update	You have been assigned to project: POEN00111088760007	project_assignment	f	2026-07-01 20:40:07.69436	15	\N
168	13	Project Assignment Update	You have been assigned to project: POEN00111088760007	project_assignment	f	2026-07-01 20:40:37.121316	15	\N
169	13	Project Assignment Update	You have been assigned to project: POEN00111088760007	project_assignment	f	2026-07-01 20:40:37.255321	15	\N
170	13	Project Assignment Update	You have been assigned to project: POEN00111088760007	project_assignment	f	2026-07-01 20:40:37.318042	15	\N
171	2	New Enquiry Assigned	Enquiry EN0012 has been assigned to you for review. File: Cryptography%20and%20network%20security-%20BCS703.pdf	enquiry_assigned	f	2026-07-02 07:50:02.815618	\N	\N
172	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0012. 	quotation_review	f	2026-07-02 07:50:06.293307	\N	\N
173	2	New External Job Work Created	A new external job work POEN0012111088760008 has been auto-created for enquiry EN0012 after PO upload.	project_created	f	2026-07-02 07:50:20.665235	16	\N
174	2	Customer Decision Recorded	Customer final decision for enquiry EN0012: accepted by customer. 	customer_decision	f	2026-07-02 07:50:20.707814	\N	\N
175	3	Material Arrival Notification	External job work material arriving: Cupboard. Expected arrival: 2023-12-11. Please create challan.	external_jobwork_material	f	2026-07-02 07:56:44.327247	14	\N
177	3	Material Arrival Notification	External job work material arriving: Chair. Expected arrival: 2026-11-12. Please create challan.	external_jobwork_material	f	2026-07-02 08:06:19.285202	15	\N
176	3	Material Arrival Notification	External job work material arriving: Chair. Expected arrival: 2026-11-12. Please create challan.	external_jobwork_material	t	2026-07-02 08:06:13.644961	15	\N
178	3	Material Arrival Notification	External job work material arriving: Cupboard. Expected arrival: 2026-12-11. Please create challan.	external_jobwork_material	f	2026-07-02 08:27:06.02084	14	\N
179	4	External Job Work Material Challan Created	Challan EJW-CHALLAN-1-1782961407533 created for external job work. Material: Cupboard. Status: Pending arrival	external_jobwork_challan	f	2026-07-02 08:33:27.548772	14	\N
180	20	Stock Allocated	Stock allocated for project POEN00088760005.Please scan QR to confirm.	allocation	f	2026-07-02 08:37:28.47421	13	\N
181	4	External Job Work Material Challan Created	Challan EJW-CHALLAN-1-1782961697041 created for external job work. Material: Cupboard. Status: Pending arrival	external_jobwork_challan	f	2026-07-02 08:38:17.061055	14	\N
182	3	External Job Work Material Received	Challan EJW-CHALLAN-1-1782961697041 has been received by store incharge. Materials logged to external job work inventory.	external_jobwork_received	f	2026-07-02 08:38:59.872521	14	\N
183	4	New External Job Work Material Request	New material request for project: POEN001088760006	material_request	f	2026-07-02 13:51:12.720715	14	\N
184	13	Materials Collected	Worker Deepak has successfully collected items for project "POEN00088760005".	collection	f	2026-07-02 14:01:46.85316	13	\N
185	4	New External Job Work Material Request	New material request for project: POEN001088760006	material_request	f	2026-07-03 08:03:10.147925	14	\N
186	4	External Material Collected	Materials collected from request #2	material_collected	f	2026-07-03 08:03:45.163455	14	\N
187	4	New External Job Work Material Request	New material request for project: POEN001088760006	material_request	f	2026-07-03 08:21:50.396246	14	\N
188	4	External Material Collected	Materials collected from request #3	material_collected	f	2026-07-03 08:22:25.532096	14	\N
189	4	New External Job Work Material Request	New material request for project: POEN001088760006	material_request	f	2026-07-03 08:37:27.139909	14	\N
190	4	External Material Collected	Materials collected from request #4	material_collected	f	2026-07-03 08:38:11.303774	14	\N
191	4	New External Job Work Material Request	New material request for project: POEN001088760006	material_request	f	2026-07-03 08:43:57.375664	14	\N
192	4	External Material Collected	Materials collected from request #5	material_collected	f	2026-07-03 08:44:44.565244	14	\N
193	13	Project Assignment Update	You have been assigned to project: POEN0012111088760008	project_assignment	f	2026-07-03 09:15:49.000285	16	\N
194	4	New External Job Work Material Request	New material request for project: POEN0012111088760008	material_request	f	2026-07-03 10:03:43.994247	16	\N
195	4	External Material Collected	Materials collected from request #6	material_collected	f	2026-07-03 10:19:41.804043	16	\N
196	2	New Enquiry Assigned	Enquiry EN0013 has been assigned to you for review. File: Cryptography%20and%20network%20security-%20BCS703.pdf	enquiry_assigned	f	2026-07-03 10:32:40.850343	\N	\N
197	1	Quotation Uploaded	A quotation has been uploaded for enquiry EN0013 by NPD user undefined.	quotation_uploaded	f	2026-07-03 10:32:58.560077	\N	\N
198	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0013. 	quotation_review	f	2026-07-03 10:33:43.547075	\N	\N
199	2	Customer Decision Recorded	Customer final decision for enquiry EN0013: accepted by customer. 	customer_decision	f	2026-07-03 10:33:52.263214	\N	\N
200	2	Customer Decision Recorded	Customer final decision for enquiry EN0013: accepted by customer. 	customer_decision	f	2026-07-03 10:34:38.074608	\N	\N
201	2	Customer Decision Recorded	Customer final decision for enquiry EN0013: accepted by customer. 	customer_decision	f	2026-07-03 10:35:16.789296	\N	\N
202	2	New External Job Work Created	A new external job work POEN001312111088760009 has been auto-created for enquiry EN0013 after PO upload.	project_created	f	2026-07-03 10:38:14.845199	17	\N
203	2	Customer Decision Recorded	Customer final decision for enquiry EN0013: accepted by customer. 	customer_decision	f	2026-07-03 10:38:14.968077	\N	\N
204	13	Project Assignment Update	You have been assigned to project: POEN001312111088760009	project_assignment	f	2026-07-03 10:38:29.58879	17	\N
205	4	New External Job Work Material Request	New material request for project: POEN001312111088760009	material_request	f	2026-07-03 10:42:03.190376	17	\N
206	4	External Material Collected	Materials collected from request #7	material_collected	f	2026-07-03 10:42:47.850953	17	\N
207	4	New External Job Work Material Request	New material request for project: POEN001312111088760009	material_request	f	2026-07-03 11:44:49.078917	17	\N
208	4	External Material Collected	Materials collected from request #8	material_collected	f	2026-07-03 11:45:25.699283	17	\N
209	4	New External Job Work Material Request	New material request for project: POEN001312111088760009	material_request	f	2026-07-03 11:52:17.001311	17	\N
210	4	External Material Collected	Materials collected from request #9	material_collected	f	2026-07-03 11:52:54.6679	17	\N
211	4	New External Job Work Material Request	New material request for project: POEN001312111088760009	material_request	f	2026-07-03 11:58:31.839096	17	\N
212	2	New Enquiry Assigned	Enquiry EN0014 has been assigned to you for review. File: Cryptography%20and%20network%20security-%20BCS703.pdf	enquiry_assigned	f	2026-07-03 12:02:54.438185	\N	\N
213	1	Quotation Uploaded	A quotation has been uploaded for enquiry EN0014 by NPD user undefined.	quotation_uploaded	f	2026-07-03 12:03:25.791291	\N	\N
214	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0014. 	quotation_review	f	2026-07-03 12:03:35.307024	\N	\N
215	2	New External Job Work Created	A new external job work POEN00141312111088760010 has been auto-created for enquiry EN0014 after PO upload.	project_created	f	2026-07-03 12:03:47.038131	18	\N
216	2	Customer Decision Recorded	Customer final decision for enquiry EN0014: accepted by customer. 	customer_decision	f	2026-07-03 12:03:47.109428	\N	\N
217	13	Project Assignment Update	You have been assigned to project: POEN00141312111088760010	project_assignment	f	2026-07-03 12:04:25.717794	18	\N
218	4	New External Job Work Material Request	New material request for project: POEN00141312111088760010	material_request	f	2026-07-03 12:07:44.152364	18	\N
219	4	New External Job Work Material Request	New material request for project: POEN00141312111088760010	material_request	f	2026-07-03 12:13:19.666453	18	\N
220	4	New External Job Work Material Request	New material request for project: POEN00141312111088760010	material_request	f	2026-07-03 12:22:00.077005	18	\N
221	13	Material Collected	✅ Material collected by Deepak. Items: 12.00 kg of Ffh. Collected at: 7/3/2026, 12:22:22 PM	material_collected	f	2026-07-03 12:22:22.069678	18	\N
222	4	External Material Collected	Materials collected from request #13	material_collected	f	2026-07-03 12:22:22.072193	18	\N
223	4	New External Job Work Material Request	New material request for project: POEN00141312111088760010	material_request	f	2026-07-03 12:30:02.130557	18	\N
224	13	Material Collected	✅ Material collected by Deepak. Items: 14.00 kg of Cg. Collected at: 7/3/2026, 12:30:58 PM	material_collected	f	2026-07-03 12:30:58.898484	18	\N
225	4	External Material Collected	Materials collected from request #14	material_collected	f	2026-07-03 12:30:58.901706	18	\N
226	4	New External Job Work Material Request	New material request for project: POEN0012111088760008	material_request	f	2026-07-03 12:35:02.067594	16	\N
227	13	Material Collected	✅ Material collected by Deepak. Items: 1.00 Unit of Reactor. Collected at: 7/3/2026, 12:36:13 PM	material_collected	f	2026-07-03 12:36:13.671165	16	\N
228	4	External Material Collected	Materials collected from request #15	material_collected	f	2026-07-03 12:36:13.674208	16	\N
229	4	New External Job Work Material Request	New material request for project: POEN00141312111088760010	material_request	f	2026-07-03 12:39:34.470206	18	\N
230	13	Material Collected	✅ Material collected by Deepak. Items: 1.00 Unit of Reactor. Collected at: 7/3/2026, 12:40:07 PM	material_collected	f	2026-07-03 12:40:07.452593	18	\N
231	4	External Material Collected	Materials collected from request #16	material_collected	f	2026-07-03 12:40:07.455047	18	\N
232	2	New Enquiry Assigned	Enquiry EN0015 has been assigned to you for review. File: ticket-2.pdf	enquiry_assigned	f	2026-07-07 12:09:55.262049	\N	\N
233	1	Quotation Uploaded	A quotation has been uploaded for enquiry EN0015 by NPD user undefined.	quotation_uploaded	f	2026-07-07 12:10:20.038846	\N	\N
234	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0015. 	quotation_review	f	2026-07-07 12:10:37.06684	\N	\N
235	2	New Project Created	A new project POEN0015141312111088760020 has been auto-created for enquiry EN0015 after PO upload.	project_created	f	2026-07-07 12:10:49.482651	19	\N
236	2	Customer Decision Recorded	Customer final decision for enquiry EN0015: accepted by customer. 	customer_decision	f	2026-07-07 12:10:49.546496	\N	\N
237	13	Project Assignment Update	You have been assigned to project: POEN0015141312111088760020	project_assignment	f	2026-07-07 12:11:07.925716	19	\N
238	2	New Enquiry Assigned	Enquiry EN0017 has been assigned to you for review. File: ticket-1.pdf	enquiry_assigned	f	2026-07-12 12:02:43.00937	\N	\N
239	1	Quotation Uploaded	A quotation has been uploaded for enquiry EN0017 by NPD user undefined.	quotation_uploaded	f	2026-07-12 12:04:10.589519	\N	\N
240	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0017. 	quotation_review	f	2026-07-12 12:11:25.165843	\N	\N
241	2	New External Job Work Created	A new external job work POEN001715141312111088760000 has been auto-created for enquiry EN0017 after PO upload.	project_created	f	2026-07-12 12:11:41.788552	20	\N
242	2	Customer Decision Recorded	Customer final decision for enquiry EN0017: accepted by customer. 	customer_decision	f	2026-07-12 12:11:41.819744	\N	\N
243	2	New Enquiry Assigned	Enquiry EN0018 has been assigned to you for review. File: ticket-2.pdf	enquiry_assigned	f	2026-07-15 13:57:13.321138	\N	\N
244	1	Quotation Uploaded	A quotation has been uploaded for enquiry EN0018 by NPD user undefined.	quotation_uploaded	f	2026-07-15 13:58:00.743213	\N	\N
245	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0018. 	quotation_review	f	2026-07-15 13:58:22.386959	\N	\N
246	2	Customer Decision Recorded	Customer final decision for enquiry EN0018: accepted by customer. 	customer_decision	f	2026-07-15 13:58:42.792329	\N	\N
247	2	Customer Decision Recorded	Customer final decision for enquiry EN0018: accepted by customer. 	customer_decision	f	2026-07-15 14:00:14.241518	\N	\N
248	2	New External Job Work Created	A new external job work POEN00181.7151413121110888e+21 has been auto-created for enquiry EN0018 after PO upload.	project_created	f	2026-07-15 14:01:24.091962	21	\N
249	2	Customer Decision Recorded	Customer final decision for enquiry EN0018: accepted by customer. 	customer_decision	f	2026-07-15 14:01:24.190039	\N	\N
250	13	Project Assignment Update	You have been assigned to project: POEN00181.7151413121110888e+21	project_assignment	f	2026-07-15 14:01:52.976486	21	\N
251	13	Project Assignment Update	You have been assigned to project: POEN00181.7151413121110888e+21	project_assignment	f	2026-07-15 14:03:36.429176	21	\N
252	4	New External Job Work Material Request	New material request for project: POEN00181.7151413121110888e+21	material_request	f	2026-07-15 14:11:36.714787	21	\N
253	13	Material Collected	✅ Material collected by Deepak. Items: 20.00 kg of Sheet. Collected at: 7/15/2026, 2:15:01 PM	material_collected	f	2026-07-15 14:15:01.931531	21	\N
254	4	External Material Collected	Materials collected from request #17	material_collected	f	2026-07-15 14:15:01.946014	21	\N
255	3	New Requirement Received	New requirement "Requirements for Project ID: 21" received.	requirement_received	f	2026-07-15 14:34:02.086216	21	\N
256	3	New Requirements Received	You have received new requirements: Requirements for Project ID: 21 	info	f	2026-07-15 14:34:02.094393	21	\N
257	2	New Enquiry Assigned	Enquiry EN0019 has been assigned to you for review. File: Admission%20Letter.pdf	enquiry_assigned	f	2026-07-16 14:11:43.558574	\N	\N
258	1	Quotation Uploaded	A quotation has been uploaded for enquiry EN0019 by NPD user undefined.	quotation_uploaded	f	2026-07-16 14:12:13.171788	\N	\N
259	2	Quotation Accepted	Management has accepted your quotation for enquiry EN0019. 	quotation_review	f	2026-07-16 14:12:43.504822	\N	\N
260	2	New External Job Work Created	A new external job work POEN00190022 has been auto-created for enquiry EN0019 after PO upload.	project_created	f	2026-07-16 14:13:14.801588	22	\N
261	2	Customer Decision Recorded	Customer final decision for enquiry EN0019: accepted by customer. 	customer_decision	f	2026-07-16 14:13:14.85886	\N	\N
262	13	Project Assignment Update	You have been assigned to project: POEN00190022	project_assignment	f	2026-07-16 14:13:49.381615	22	\N
263	4	New External Job Work Material Request	New material request for project: POEN00190022	material_request	f	2026-07-16 14:35:13.588268	22	\N
264	2	New Enquiry Assigned	Enquiry EN0020 has been assigned to you for review. File: Cryptography%20and%20network%20security-%20BCS703.pdf	enquiry_assigned	t	2026-07-28 12:13:50.043594	\N	\N
888	3	Stock Item Requested	Store needs a stock item for job work: "Rod" (HSN 123421, unit pcs). Please create it in the stock item master.	jobwork_stock_item_request	t	2026-10-14 05:58:12.338872	\N	\N
889	3	Stock Item Requested	Store needs a stock item for job work: "Rod" (HSN 1221, unit 12 pcs). Please create it in the stock item master.	jobwork_stock_item_request	f	2026-10-14 06:09:42.011343	\N	\N
890	3	Stock Item Requested	Store needs a stock item for job work: "Rod" (HSN 1221, unit 12 pcs). Please create it in the stock item master.	jobwork_stock_item_request	f	2026-10-14 06:09:58.482023	\N	\N
2821	3	Stock Item Requested	Ankit needs a stock item: "Car" (project POEN0015141312111088760020).	jobwork_stock_item_request	t	2026-10-14 10:19:22.714592	19	{"dc_id": null, "project_id": 19, "request_id": 90, "job_work_item_id": 1087}
891	3	Stock Item Requested	Store needs a stock item for job work: "Sheet" (HSN 12342, unit pcs). Please create it in the stock item master.	jobwork_stock_item_request	t	2026-10-14 06:11:07.134045	\N	\N
892	3	Delivery Challan Awaiting Approval	DC SE/DC/0001 to Gaurav needs your approval.	jobwork_dc_pending	f	2026-10-14 06:15:31.331971	11	\N
893	4	Delivery Challan Approved	DC SE/DC/0001 is approved and ready to dispatch.	jobwork_dc_approved	f	2026-10-14 06:18:59.442584	11	\N
894	3	Delivery Challan Awaiting Approval	DC SE/DC/0002 to DEV Vendor - Chennai (Tamil Nadu) needs your approval.	jobwork_dc_pending	f	2026-10-14 06:23:43.97412	13	\N
895	4	Delivery Challan Approved	DC SE/DC/0002 is approved and ready to dispatch.	jobwork_dc_approved	f	2026-10-14 06:24:59.632975	13	\N
896	13	Material Dispatched	DC SE/DC/0002 has left the factory for DEV Vendor - Chennai (Tamil Nadu).	jobwork_dc_dispatched	f	2026-10-14 06:26:01.881256	13	\N
897	13	Material Moved	DC SE/DC/0002 moved from DEV Vendor - Chennai (Tamil Nadu) to DEV Vendor - Bengaluru (Karnataka).	jobwork_dc_moved	f	2026-10-14 06:26:46.984228	13	\N
898	13	Material Dispatched	DC SE/DC/0001 has left the factory for Gaurav.	jobwork_dc_dispatched	f	2026-10-14 06:27:15.080162	11	\N
899	13	Material Dispatched	DC SE/DC/0001 has left the factory for Gaurav.	jobwork_dc_dispatched	f	2026-10-14 06:27:15.080162	13	\N
900	3	Vendor Invoice Recorded	Invoice 455543322222222 from Gaurav for DC SE/DC/0001.	jobwork_vendor_invoice	f	2026-10-14 06:29:08.413165	\N	\N
901	13	Material Returned	DC SE/DC/0002 has a partial return from DEV Vendor - Bengaluru (Karnataka).	jobwork_dc_return	f	2026-10-14 06:31:09.138448	13	\N
902	3	Job Work Return Recorded	DC SE/DC/0002: return from DEV Vendor - Bengaluru (Karnataka).	jobwork_return_recorded	f	2026-10-14 06:31:09.138448	\N	\N
903	13	Job Work Complete	DC SE/DC/0002 is fully back and closed.	jobwork_dc_closed	f	2026-10-14 06:31:19.733532	13	\N
904	3	Job Work Return Recorded	DC SE/DC/0002: return from DEV Vendor - Bengaluru (Karnataka).	jobwork_return_recorded	f	2026-10-14 06:31:19.733532	\N	\N
905	13	Material Moved	DC SE/DC/0001 moved from Gaurav to DEV Vendor - Chennai (Tamil Nadu).	jobwork_dc_moved	f	2026-10-14 06:31:34.819723	11	\N
906	13	Material Moved	DC SE/DC/0001 moved from Gaurav to DEV Vendor - Chennai (Tamil Nadu).	jobwork_dc_moved	f	2026-10-14 06:31:34.819723	13	\N
907	13	Job Work Complete	DC SE/DC/0001 is fully back and closed.	jobwork_dc_closed	f	2026-10-14 06:31:47.71968	11	\N
908	13	Job Work Complete	DC SE/DC/0001 is fully back and closed.	jobwork_dc_closed	f	2026-10-14 06:31:47.71968	13	\N
909	3	Job Work Return Recorded	DC SE/DC/0001: return from DEV Vendor - Chennai (Tamil Nadu).	jobwork_return_recorded	f	2026-10-14 06:31:47.71968	\N	\N
3420	4	Stock Item Ready	Stock item "Car" has been created. It has been filled in on your item.	jobwork_stock_item_resolved	f	2026-10-14 10:31:57.886214	19	{"dc_id": null, "status": "created", "request_id": 90, "stock_item_id": 175, "job_work_item_id": 1087}
\.


--
-- Data for Name: order_receipt_items; Type: TABLE DATA; Schema: public; Owner: postgres
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
41	32	\N	Steel	\N	20.00	20.00		\N	\N	\N	\N	2026-06-17 00:46:43.285962	36
42	32	\N	Plastic	\N	10.00	9.00		\N	\N	\N	\N	2026-06-17 00:46:43.285962	35
\.


--
-- Data for Name: order_receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_receipts (id, order_id, company_id, bill_image_url, receipt_date, total_amount, total_gst_amount, status, submitted_by, approved_by, notes, created_at, updated_at, purchase_order_id, gross_weight, tare_weight, net_weight, vehicle_weight_unit, receipt_status, total_quantity_received) FROM stdin;
19	\N	1	/uploads/bills/bill-1773606970835-658763854.jpeg	2026-03-16	\N	\N	pending	4	\N	\N	2026-03-16 02:06:11.05926	2026-03-16 02:06:11.05926	17	\N	\N	\N	kg	complete	2.00
21	\N	1	/uploads/bills/bill-1773645700086-375445236.jpeg	2026-03-16	\N	\N	pending	4	\N	\N	2026-03-16 12:51:40.259483	2026-03-16 12:51:40.259483	14	\N	\N	\N	kg	complete	2.00
23	\N	1	/uploads/bills/bill-1773646745677-535673061.jpeg	2026-03-16	\N	\N	pending	4	\N	\N	2026-03-16 13:09:05.854698	2026-03-16 13:09:05.854698	13	\N	\N	\N	kg	partial	3.00
24	\N	1	/uploads/bills/bill-1773646924480-365831448.jpeg	2026-03-16	\N	\N	pending	4	\N	\N	2026-03-16 13:12:05.115868	2026-03-16 13:12:05.115868	18	\N	\N	\N	kg	partial	1.00
25	\N	1	/uploads/bills/bill-1773647161964-239276041.jpeg	2026-03-16	\N	\N	pending	4	\N	\N	2026-03-16 13:16:02.15597	2026-03-16 13:16:02.15597	18	\N	\N	\N	kg	partial	1.00
26	\N	1	/uploads/bills/bill-1773656838521-290400942.jpeg	2026-03-16	\N	\N	pending	4	\N	\N	2026-03-16 15:57:18.759996	2026-03-16 15:57:18.759996	19	\N	\N	\N	kg	complete	5.00
27	\N	2	/uploads/bills/bill-1775766382659-68137717.jpeg	2026-04-10	\N	\N	pending	8	\N	\N	2026-04-10 01:56:22.864402	2026-04-10 01:56:22.864402	21	\N	\N	\N	kg	partial	20.00
28	\N	2	/uploads/bills/bill-1775769432346-494427097.jpeg	2026-04-10	\N	\N	pending	8	\N	\N	2026-04-10 02:47:12.518003	2026-04-10 02:47:12.518003	21	\N	\N	\N	kg	complete	20.00
29	\N	2	/uploads/bills/bill-1775769587962-428565915.jpeg	2026-04-10	\N	\N	pending	8	\N	\N	2026-04-10 02:49:48.202828	2026-04-10 02:49:48.202828	23	\N	\N	\N	kg	partial	12.00
30	\N	3	/uploads/bills/bill-1777557565230-787743690.jpeg	2026-04-30	\N	\N	pending	11	\N	\N	2026-04-30 19:29:25.751725	2026-04-30 19:29:25.751725	25	54.00	25.00	29.00	kg	complete	5.00
31	\N	1	/uploads/bills/bill-1779484044124-963043164.jpeg	2026-05-23	\N	\N	pending	4	\N	\N	2026-05-23 02:37:24.285132	2026-05-23 02:37:24.285132	26	\N	\N	\N	kg	complete	5.00
22	\N	1	/uploads/bills/bill-1773645783385-206035183.jpeg	2026-03-16	\N	\N	approved	4	3	\N	2026-03-16 12:53:03.539186	2026-06-17 00:41:30.130192	13	\N	\N	\N	kg	partial	5.00
20	\N	1	/uploads/bills/bill-1773607233616-153137823.jpeg	2026-03-16	\N	\N	approved	4	3	\N	2026-03-16 02:10:33.829937	2026-06-17 00:41:47.497806	14	\N	\N	\N	kg	partial	3.00
32	\N	1	/uploads/bills/bill-1781637402978-95980371.jpeg	2026-06-17	\N	\N	pending	4	\N	\N	2026-06-17 00:46:43.285962	2026-06-17 00:46:43.285962	27	\N	\N	\N	kg	partial	29.00
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, company_id, order_type, status, created_by, total_amount, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_tokens (id, user_id, token, expires_at, used, created_at) FROM stdin;
1	1	f879f6ee-ddf0-4889-a788-a07002e166a2	2026-02-05 01:38:29.316	f	2026-02-05 01:23:29.31742
\.


--
-- Data for Name: project_internal_reports; Type: TABLE DATA; Schema: public; Owner: postgres
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
15	21	Fit Up	1	Project%20Roles%20(1).pptx_20260702_133151_0000.pdf	/uploads/report-1784105659994.pdf	13	2026-07-15 14:24:22.779042
16	21	Welding	1	IBM%20PY0101EN%20Certificate%20_%20Cognitive%20Class.pdf	/uploads/report-1784105686419.pdf	13	2026-07-15 14:24:46.729553
\.


--
-- Data for Name: project_status_history; Type: TABLE DATA; Schema: public; Owner: postgres
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
33	11	Fabrication	Job Work	13	2026-05-29 14:49:48.377636	Dispatched for Job Work (Galvanizing) under Job ID JW-2026-0003
34	11	Fabrication	Job Work	13	2026-06-10 23:16:10.704377	Dispatched for Job Work (Laser Cutting) under Job ID JW-2026-0004
35	11	Fabrication	Job Work	13	2026-06-11 10:02:39.055896	Dispatched for Job Work (Powder Coating) under Job ID JW-2026-0001
36	11	Fabrication	Job Work	13	2026-06-11 10:02:39.137037	Dispatched for Job Work (Powder Coating) under Job ID JW-2026-0002
37	11	Fabrication	Job Work	13	2026-06-11 12:09:55.971706	Dispatched for Job Work (Galvanizing) under Job ID JW-2026-0001
38	11	Job Work	Cutting	13	2026-06-11 12:20:28.6321	Project moved to Cutting phase
39	11	Cutting	Completed	13	2026-06-11 12:20:50.753639	Project moved to Completed phase
40	13	\N	Started	13	2026-06-11 12:53:17.889939	Project started by Project Manager
41	13	Started	Cutting	13	2026-06-11 12:53:27.202858	Project moved to Cutting phase
42	13	Fabrication	Job Work	13	2026-06-11 12:56:46.710112	Dispatched for Job Work (Laser Cutting) under Job ID JW-2026-0002
43	13	Fabrication	Job Work	13	2026-06-11 12:56:48.169286	Dispatched for Job Work (Laser Cutting) under Job ID JW-2026-0003
44	13	Fabrication	Job Work	13	2026-06-11 21:58:07.373263	Dispatched for Job Work (Laser Cutting) under Job ID JW-2026-0004
45	13	Fabrication	Job Work	13	2026-06-11 22:05:57.352973	Dispatched for Job Work (Laser Cutting) under Job ID JW-2026-0005
46	13	Fabrication	Job Work	13	2026-06-11 23:48:01.909269	Dispatched for Job Work (Laser Cutting) under Job ID JW-2026-0006
47	13	Job Work	Fit Up	13	2026-06-12 00:14:26.246366	Project moved to Fit Up phase
48	13	Fit Up	Machining	13	2026-06-12 00:14:32.571883	Project moved to Machining phase
49	13	Machining	Fit Up	13	2026-06-12 00:18:25.832964	Project moved to Fit Up phase
50	13	Fabrication	Job Work	13	2026-06-17 00:12:43.62992	Dispatched for Job Work (Others) under Job ID JW-2026-0007
51	14	\N	Started	13	2026-06-17 00:20:03.975324	Project started by Project Manager
52	15	\N	Started	13	2026-07-01 20:41:11.167162	Project started by Project Manager
53	15	Started	Cutting	13	2026-07-01 20:41:28.41916	Project moved to Cutting phase
54	17	\N	Started	13	2026-07-03 10:41:31.130812	Project started by Project Manager
55	18	\N	Started	13	2026-07-03 12:12:31.711585	Project started by Project Manager
56	16	\N	Started	13	2026-07-03 12:34:54.680298	Project started by Project Manager
57	21	\N	Started	13	2026-07-15 14:23:12.159464	Project started by Project Manager
58	21	Started	Cutting	13	2026-07-15 14:23:32.57248	Project moved to Cutting phase
59	21	Cutting	Preparation	13	2026-07-15 14:23:37.31	Project moved to Preparation phase
60	21	Preparation	Fit Up	13	2026-07-15 14:23:42.159506	Project moved to Fit Up phase
61	21	Fit Up	Welding	13	2026-07-15 14:24:30.323509	Project moved to Welding phase
62	21	Welding	Welding	13	2026-07-15 14:24:49.554051	Project moved to Welding phase
63	21	Welding	Dressing/Finishing	13	2026-07-15 14:24:56.121461	Project moved to Dressing/Finishing phase
647	11	\N	Job Work: dc_created	4	2026-10-14 06:15:31.331971	Delivery challan SE/DC/0001 created for Gaurav
648	13	\N	Job Work: dc_created	4	2026-10-14 06:15:31.331971	Delivery challan SE/DC/0001 created for Gaurav
649	11	Job Work: dc_created	Job Work: approved	3	2026-10-14 06:18:59.442584	Delivery challan SE/DC/0001 approved
650	13	Job Work: dc_created	Job Work: approved	3	2026-10-14 06:18:59.442584	Delivery challan SE/DC/0001 approved
651	13	\N	Job Work: dc_created	4	2026-10-14 06:23:43.97412	Delivery challan SE/DC/0002 created for DEV Vendor - Chennai (Tamil Nadu)
652	13	Job Work: dc_created	Job Work: approved	3	2026-10-14 06:24:59.632975	Delivery challan SE/DC/0002 approved
653	13	Job Work: approved	Job Work: dispatched	4	2026-10-14 06:26:01.881256	Delivery challan SE/DC/0002 dispatched to DEV Vendor - Chennai (Tamil Nadu)
665	19	\N	Started	13	2026-10-14 06:35:16.044169	Project started by Project Manager
654	13	Job Work: dispatched	Job Work: dispatched	4	2026-10-14 06:26:46.984228	Delivery challan SE/DC/0002 moved from DEV Vendor - Chennai (Tamil Nadu) to DEV Vendor - Bengaluru (Karnataka)
655	11	Job Work: approved	Job Work: dispatched	4	2026-10-14 06:27:15.080162	Delivery challan SE/DC/0001 dispatched to Gaurav
656	13	Job Work: approved	Job Work: dispatched	4	2026-10-14 06:27:15.080162	Delivery challan SE/DC/0001 dispatched to Gaurav
657	11	Job Work: dispatched	Job Work: dispatched	4	2026-10-14 06:29:08.413165	Vendor invoice 455543322222222 from Gaurav recorded on delivery challan SE/DC/0001
658	13	Job Work: dispatched	Job Work: dispatched	4	2026-10-14 06:29:08.413165	Vendor invoice 455543322222222 from Gaurav recorded on delivery challan SE/DC/0001
659	13	Job Work: dispatched	Job Work: partially_returned	4	2026-10-14 06:31:09.138448	Partial return recorded on delivery challan SE/DC/0002 from DEV Vendor - Bengaluru (Karnataka)
660	13	Job Work: partially_returned	Job Work: closed	4	2026-10-14 06:31:19.733532	Delivery challan SE/DC/0002 fully returned from DEV Vendor - Bengaluru (Karnataka) and closed
661	11	Job Work: dispatched	Job Work: dispatched	4	2026-10-14 06:31:34.819723	Delivery challan SE/DC/0001 moved from Gaurav to DEV Vendor - Chennai (Tamil Nadu)
662	13	Job Work: dispatched	Job Work: dispatched	4	2026-10-14 06:31:34.819723	Delivery challan SE/DC/0001 moved from Gaurav to DEV Vendor - Chennai (Tamil Nadu)
663	11	Job Work: dispatched	Job Work: closed	4	2026-10-14 06:31:47.71968	Delivery challan SE/DC/0001 fully returned from DEV Vendor - Chennai (Tamil Nadu) and closed
664	13	Job Work: dispatched	Job Work: closed	4	2026-10-14 06:31:47.71968	Delivery challan SE/DC/0001 fully returned from DEV Vendor - Chennai (Tamil Nadu) and closed
2365	19	Fabrication	Job Work	13	2026-10-14 10:18:35.69792	Dispatched for Job Work (Laser Cutting) under Job ID JW-2026-0008
\.


--
-- Data for Name: project_workers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_workers (id, project_id, worker_id, assigned_at, assigned_by) FROM stdin;
1	2	20	2026-05-23 08:06:48.411149	\N
2	1	20	2026-05-23 08:11:23.4432	\N
5	1	21	2026-05-23 09:59:06.066006	\N
6	10	20	2026-05-23 12:04:58.033062	\N
7	10	21	2026-05-23 12:05:07.14164	\N
8	11	20	2026-05-23 13:16:46.636102	\N
10	14	20	2026-06-17 00:19:54.497831	\N
11	14	21	2026-06-17 00:19:58.357209	\N
12	15	20	2026-07-01 20:41:04.093441	\N
13	15	21	2026-07-01 20:41:06.967325	\N
14	13	20	2026-07-02 08:55:35.894348	\N
15	13	21	2026-07-02 08:55:38.382178	\N
16	16	20	2026-07-03 10:03:28.227401	\N
17	17	20	2026-07-03 10:41:52.198547	\N
20	18	20	2026-07-03 12:13:01.571318	\N
21	19	20	2026-07-07 12:11:14.936212	\N
23	21	20	2026-07-15 14:29:40.373773	\N
24	21	21	2026-07-15 14:29:43.298285	\N
25	22	20	2026-07-16 14:14:23.467091	\N
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projects (id, name, description, company_id, created_by, status, sketch_url, hsn_code, created_at, updated_at, po_number, assigned_to, priority, start_date, end_date, npd_user_id, project_id, po_filename, po_path, project_type) FROM stdin;
2	PO0000000001	Auto-created from Enquiry EN0005. PO uploaded by undefined.	1	2	completed	\N	\N	2026-04-09 21:48:06.137921	2026-05-23 07:31:51.135777	PO0000000001	13	medium	\N	\N	2	\N	PO_EN0005_1773340542017-1.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0005_1773340542017-1.pdf	regular
6	POEN00010001	Auto-created from Enquiry EN0001. PO uploaded by undefined.	3	12	in_progress	/uploads/sketch-1777471411876.jpg	\N	2026-04-29 19:21:09.094045	2026-04-29 19:33:32.015576	POEN00010001	12	medium	\N	\N	12	\N	PO_EN0001_CSE_Major%20Project%20Phase-2%20Synopsis.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0001_CSE_Major%20Project%20Phase-2%20Synopsis.pdf	regular
3	POEN00010001	Auto-created from Enquiry EN0001. PO uploaded by undefined.	2	6	pending	\N	\N	2026-04-09 22:26:30.621559	2026-04-09 22:26:30.621559	POEN00010001	6	medium	\N	\N	6	\N	PO_EN0001_145-Conduct%20of%20Intermediate%20Reviews%20and%20entry%20of%20CIE%20Marks.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0001_145-Conduct%20of%20Intermediate%20Reviews%20and%20entry%20of%20CIE%20Marks.pdf	regular
4	POEN000210002	Auto-created from Enquiry EN0002. PO uploaded by undefined.	2	6	pending	/uploads/sketch-1775768833730.jpg	\N	2026-04-10 02:26:52.694951	2026-04-10 02:37:13.798045	POEN000210002	6	medium	\N	\N	6	\N	PO_EN0002_1773340542017.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0002_1773340542017.pdf	regular
7	POEN000210002	Auto-created from Enquiry EN0002. PO uploaded by undefined.	3	12	pending	\N	\N	2026-05-07 19:24:43.679464	2026-05-07 19:27:20.956452	POEN000210002	12	medium	\N	\N	12	\N	PO_EN0002_GST%2520Management%2520ERP%2520System%2520(1).pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0002_GST%2520Management%2520ERP%2520System%2520(1).pdf	regular
5	POEN0003210003	Auto-created from Enquiry EN0003. PO uploaded by undefined.	2	6	pending	/uploads/sketch-1775804524047.jpg	\N	2026-04-10 12:30:16.979583	2026-04-10 12:32:04.270347	POEN0003210003	6	medium	\N	\N	6	\N	PO_EN0003_BCS702-module-3-textbook-8.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0003_BCS702-module-3-textbook-8.pdf	regular
10	POEN00060002	Auto-created from Enquiry EN0006. PO uploaded by undefined.	1	2	completed	/uploads/sketch-1779517579288.jpg	\N	2026-05-23 11:54:27.272172	2026-05-23 11:56:19.376495	POEN00060002	13	medium	\N	\N	2	\N	PO_EN0006_Gmail%20-%20TCS%20NQT%20All%20India%20batch%202026%20_%2021st%20May%202026.PDF	D:\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0006_Gmail%20-%20TCS%20NQT%20All%20India%20batch%202026%20_%2021st%20May%202026.PDF	regular
1	PO-EN0001-7598	Auto-created from Enquiry EN0001. PO uploaded by undefined.	1	2	completed	/uploads/sketch-1770923702103.jpg	\N	2026-02-13 00:01:47.102149	2026-05-23 07:31:45.717273	PO-EN0001-7598	13	medium	\N	\N	2	\N	PO_EN0001_5%20AND%207%20RV.pdf	C:\\Users\\Saurabh Kumar\\OneDrive\\Desktop\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0001_5%20AND%207%20RV.pdf	regular
11	POEN000760003	Auto-created from Enquiry EN0007. PO uploaded by undefined.	1	1	completed	\N	\N	2026-05-23 12:25:34.058186	2026-05-23 12:26:51.703346	POEN000760003	13	medium	\N	\N	2	\N	PO_EN0007_report-1779508965183.pdf	D:\\GST-SVCEE\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0007_report-1779508965183.pdf	regular
16	POEN0012111088760008	External job work auto-created from Enquiry EN0012. PO uploaded by undefined.	1	1	in_progress	\N	\N	2026-07-02 07:50:20.663212	2026-07-03 09:15:48.992501	POEN0012111088760008	13	medium	\N	\N	2	\N	PO_EN0012_Cryptography%20and%20network%20security-%20BCS703.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0012_Cryptography%20and%20network%20security-%20BCS703.pdf	external_job_work
14	POEN001088760006	External job work auto-created from Enquiry EN0010. PO uploaded by undefined.	1	1	in_progress	\N	\N	2026-06-17 00:18:22.956531	2026-06-17 00:19:25.312906	POEN001088760006	13	medium	\N	\N	2	\N	PO_EN0010_Cryptography%20and%20network%20security-%20BCS703.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0010_Cryptography%20and%20network%20security-%20BCS703.pdf	external_job_work
12	POEN0008760004	Auto-created from Enquiry EN0008. PO uploaded by undefined.	1	1	pending	\N	\N	2026-06-11 12:43:48.674196	2026-06-11 12:43:48.674196	POEN0008760004	2	medium	\N	\N	2	\N	PO_EN0008_10th%20Marks%20Card.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0008_10th%20Marks%20Card.pdf	regular
15	POEN00111088760007	External job work auto-created from Enquiry EN0011. PO uploaded by undefined.	1	1	in_progress	\N	\N	2026-07-01 20:39:03.42533	2026-07-01 20:40:37.314724	POEN00111088760007	13	medium	\N	\N	2	\N	PO_EN0011_Nemotron3Ultra_Free_Setup_Guide_TechwithNandini.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0011_Nemotron3Ultra_Free_Setup_Guide_TechwithNandini.pdf	external_job_work
13	POEN00088760005	Auto-created from Enquiry EN0008. PO uploaded by undefined.	1	1	in_progress	/uploads/sketch-1781162297944.jpg	\N	2026-06-11 12:46:00.329846	2026-06-11 12:52:33.826993	POEN00088760005	13	medium	\N	\N	2	\N	PO_EN0008_10th%20Marks%20Card.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0008_10th%20Marks%20Card.pdf	regular
17	POEN001312111088760009	External job work auto-created from Enquiry EN0013. PO uploaded by undefined.	1	1	in_progress	\N	\N	2026-07-03 10:38:14.839718	2026-07-03 10:38:29.580027	POEN001312111088760009	13	medium	\N	\N	2	\N	PO_EN0013_Cryptography%20and%20network%20security-%20BCS703.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0013_Cryptography%20and%20network%20security-%20BCS703.pdf	external_job_work
18	POEN00141312111088760010	External job work auto-created from Enquiry EN0014. PO uploaded by undefined.	1	1	in_progress	\N	\N	2026-07-03 12:03:47.032845	2026-07-03 12:04:25.708757	POEN00141312111088760010	13	medium	\N	\N	2	\N	PO_EN0014_Cryptography%20and%20network%20security-%20BCS703.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0014_Cryptography%20and%20network%20security-%20BCS703.pdf	external_job_work
20	POEN001715141312111088760000	External job work auto-created from Enquiry EN0017. PO uploaded by undefined.	1	1	pending	\N	\N	2026-07-12 12:11:41.778683	2026-07-12 12:11:41.778683	POEN001715141312111088760000	2	medium	\N	\N	2	\N	PO_EN0017_Nemotron3Ultra_Free_Setup_Guide_TechwithNandini.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0017_Nemotron3Ultra_Free_Setup_Guide_TechwithNandini.pdf	external_job_work
21	POEN00181.7151413121110888e+21	External job work auto-created from Enquiry EN0018. PO uploaded by undefined.	1	1	in_progress	\N	\N	2026-07-15 14:01:24.084944	2026-07-15 14:03:36.414346	POEN00181.7151413121110888e+21	13	medium	\N	\N	2	\N	PO_EN0018_NumberPrograms_Qspiders.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0018_NumberPrograms_Qspiders.pdf	external_job_work
19	POEN0015141312111088760020	Auto-created from Enquiry EN0015. PO uploaded by undefined.	1	1	in_progress	\N	\N	2026-07-07 12:10:49.474038	2026-07-07 12:11:07.92462	POEN0015141312111088760020	13	medium	\N	\N	2	\N	PO_EN0015_ticket-1.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0015_ticket-1.pdf	regular
22	POEN00190022	External job work auto-created from Enquiry EN0019. PO uploaded by undefined.	1	1	pending	\N	\N	2026-07-16 14:13:14.783137	2026-07-16 14:13:49.373084	POEN00190022	13	medium	\N	\N	2	\N	PO_EN0019_Admission%20Letter.pdf	D:\\gst-management-app\\gst-management-app\\backend\\uploads\\enquiries\\PO_EN0019_Admission%20Letter.pdf	external_job_work
\.


--
-- Data for Name: purchase_order_items; Type: TABLE DATA; Schema: public; Owner: postgres
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
35	27	Plastic		10.00		\N	0.00	2026-06-17 00:43:17.123429	0.00
36	27	Steel		20.00		\N	0.00	2026-06-17 00:43:17.123429	0.00
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: postgres
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
13	1	1	Gaurav 	gk@gmail.com	2843.50	delivered	3	2026-02-28 11:53:21.841034	2026-06-17 00:41:42.347905	1
27	1	1	Gaurav	gk@gmail.com	0.00	pending	3	2026-06-17 00:43:17.123429	2026-06-17 00:43:17.123429	7
\.


--
-- Data for Name: requirement_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.requirement_items (id, requirement_id, serial_number, item_name, quantity, hsn, created_at) FROM stdin;
1	9	1	Steel bar	50kg	48445	2026-04-10 02:36:05.503478
2	10	1	Steel bar	50 kg	12585	2026-04-10 12:33:16.668147
3	11	1	Plastic	5.00	543	2026-04-30 18:45:54.872485
4	11	2	Steel Rod	2.00	234	2026-04-30 18:45:54.876149
5	12	1	Steel	3.00	1221	2026-06-11 12:52:09.854811
6	12	2	Rod	2.00	12211	2026-06-11 12:52:09.866106
7	13	1	Steel bar	15		2026-07-15 14:34:02.073117
\.


--
-- Data for Name: requirements; Type: TABLE DATA; Schema: public; Owner: postgres
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
12	Requirements for Project ID: 13	medium	2	3	13	pending	2026-06-11 12:52:09.821901	2026-06-11 12:52:09.821901
13	Requirements for Project ID: 21	medium	2	3	21	pending	2026-07-15 14:34:02.026605	2026-07-15 14:34:02.026605
\.


--
-- Data for Name: revision_bom_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.revision_bom_items (id, revision_id, serial_number, material_name, quantity, unit, estimated_cost, supplier, notes, created_at) FROM stdin;
\.


--
-- Data for Name: revisions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.revisions (id, project_id, revision_number, sketch_url, notes, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: stock_item_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_item_requests (id, company_id, requested_name, requested_hsn, requested_unit, note, requested_by, requester_role, job_work_item_id, dc_id, project_id, context, status, stock_item_id, reason, resolved_by, resolved_at, created_at, updated_at, source) FROM stdin;
90	1	Car	23315	pcs	\N	4	store_incharge	1087	\N	19	{"unit": "pcs", "job_id": "JW-2026-0008", "process": "Laser Cutting", "weights": {"actual": null, "loaded": null, "unloaded": null}, "quantity": "1.00", "project_name": "POEN0015141312111088760020", "requested_at": "2026-10-14T04:49:22.728Z", "customer_po_no": "POEN0015141312111088760020", "requester_name": "Ankit", "item_description": "Car"}	created	175	\N	3	2026-10-14 10:31:57.886214	2026-10-14 10:19:22.714592	2026-10-14 10:31:57.886214	stock
\.


--
-- Data for Name: stock_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_items (id, company_id, name, hsn, unit, created_by, created_at) FROM stdin;
175	1	Car	23315	pcs	3	2026-10-14 10:31:57.886214
25	1	Rod	123421	pcs	3	2026-10-14 06:01:16.627837
26	1	Sheet	12342	pcs	3	2026-10-14 06:12:11.89965
28	1	Rod 2	1221	12 pcs	3	2026-10-14 06:12:27.505447
\.


--
-- Data for Name: store_request_items; Type: TABLE DATA; Schema: public; Owner: postgres
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
13	9	Rod	2.00	pcs	12211	\N	2026-06-17 00:13:47.30238	0.00	0.00
12	9	Steel	3.00	pcs	1221	\N	2026-06-17 00:13:47.29799	0.00	3.00
\.


--
-- Data for Name: store_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.store_requests (id, project_id, project_name, project_manager_id, project_manager_name, company_id, requested_by, status, request_date, response_date, responded_by, notes, created_at, updated_at, allocated_to_worker_id, allocated_to_worker_name, allocated_at) FROM stdin;
1	2	PO0000000001	13	Sanjeev	1	13	fulfilled	2026-05-23 07:42:44.058466	\N	\N	\N	2026-05-23 07:42:44.058466	2026-05-23 08:31:39.092486	\N	\N	\N
2	1	PO-EN0001-7598	13	Sanjeev	1	13	fulfilled	2026-05-23 08:14:50.372646	\N	\N	\N	2026-05-23 08:14:50.372646	2026-05-23 08:32:21.343304	20	Deepak	\N
5	1	PO-EN0001-7598	13	Sanjeev	1	13	fulfilled	2026-05-23 09:59:55.070656	\N	\N	\N	2026-05-23 09:59:55.070656	2026-05-23 10:02:30.673271	20	Deepak	\N
6	10	POEN00060002	13	Sanjeev	1	13	fulfilled	2026-05-23 12:05:18.496545	\N	\N	\N	2026-05-23 12:05:18.496545	2026-05-23 12:09:42.1432	21	Shivam	\N
7	10	POEN00060002	13	Sanjeev	1	13	pending	2026-05-23 12:11:39.8944	\N	\N	\N	2026-05-23 12:11:39.8944	2026-05-23 12:11:39.8944	20	Deepak	\N
8	10	POEN00060002	13	Sanjeev	1	13	partially_allocated	2026-05-23 12:11:52.02598	\N	\N	\N	2026-05-23 12:11:52.02598	2026-05-23 12:14:03.282229	21	Shivam	\N
9	13	POEN00088760005	13	Sanjeev	1	13	partially_allocated	2026-06-17 00:13:47.291227	\N	\N	\N	2026-06-17 00:13:47.291227	2026-07-02 14:01:46.85316	20	Deepak	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
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
-- Data for Name: vendor_bids; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vendor_bids (id, demand_id, vendor_id, total_amount, supply_until_date, notes, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: vendor_demands; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vendor_demands (id, title, description, company_id, created_by, status, bid_deadline, created_at, updated_at) FROM stdin;
\.


--
-- Name: allocation_inventory_mapping_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.allocation_inventory_mapping_id_seq', 5, true);


--
-- Name: allocation_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.allocation_tasks_id_seq', 8, true);


--
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attendance_id_seq', 496, true);


--
-- Name: barcodes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.barcodes_id_seq', 20, true);


--
-- Name: bid_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bid_items_id_seq', 1, false);


--
-- Name: bill_of_materials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bill_of_materials_id_seq', 30, true);


--
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.companies_id_seq', 59, true);


--
-- Name: demand_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.demand_items_id_seq', 1, false);


--
-- Name: enquiries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.enquiries_id_seq', 29, true);


--
-- Name: external_job_work_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.external_job_work_history_id_seq', 1, false);


--
-- Name: external_job_work_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.external_job_work_id_seq', 1, false);


--
-- Name: external_job_work_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.external_job_work_items_id_seq', 1, false);


--
-- Name: external_jobwork_challans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.external_jobwork_challans_id_seq', 18, true);


--
-- Name: external_jobwork_inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.external_jobwork_inventory_id_seq', 16, true);


--
-- Name: external_jobwork_material_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.external_jobwork_material_notifications_id_seq', 20, true);


--
-- Name: external_jobwork_outstock_request_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.external_jobwork_outstock_request_items_id_seq', 18, true);


--
-- Name: external_jobwork_outstock_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.external_jobwork_outstock_requests_id_seq', 18, true);


--
-- Name: external_jobwork_outstock_transaction_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.external_jobwork_outstock_transaction_items_id_seq', 8, true);


--
-- Name: external_jobwork_outstock_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.external_jobwork_outstock_transactions_id_seq', 8, true);


--
-- Name: external_material_collections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.external_material_collections_id_seq', 16, true);


--
-- Name: gst_rates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.gst_rates_id_seq', 6, true);


--
-- Name: inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_id_seq', 30, true);


--
-- Name: job_work_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.job_work_images_id_seq', 6, true);


--
-- Name: job_work_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.job_work_items_id_seq', 1391, true);


--
-- Name: job_work_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.job_work_requests_id_seq', 1414, true);


--
-- Name: jobwork_dc_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.jobwork_dc_items_id_seq', 1205, true);


--
-- Name: jobwork_dc_movements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.jobwork_dc_movements_id_seq', 50, true);


--
-- Name: jobwork_dcs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.jobwork_dcs_id_seq', 1132, true);


--
-- Name: jobwork_return_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.jobwork_return_items_id_seq', 300, true);


--
-- Name: jobwork_returns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.jobwork_returns_id_seq', 384, true);


--
-- Name: major_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.major_orders_id_seq', 1, false);


--
-- Name: master_materials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.master_materials_id_seq', 12, true);


--
-- Name: master_vendors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.master_vendors_id_seq', 175, true);


--
-- Name: material_usage_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.material_usage_reports_id_seq', 1, true);


--
-- Name: materials_detail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.materials_detail_id_seq', 1, false);


--
-- Name: minor_order_bids_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.minor_order_bids_id_seq', 1, false);


--
-- Name: minor_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.minor_orders_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 3420, true);


--
-- Name: order_receipt_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_receipt_items_id_seq', 42, true);


--
-- Name: order_receipts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_receipts_id_seq', 32, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 1, false);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 1, true);


--
-- Name: project_internal_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_internal_reports_id_seq', 17, true);


--
-- Name: project_status_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_status_history_id_seq', 2933, true);


--
-- Name: project_workers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_workers_id_seq', 25, true);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.projects_id_seq', 76, true);


--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchase_order_items_id_seq', 36, true);


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchase_orders_id_seq', 27, true);


--
-- Name: requirement_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.requirement_items_id_seq', 7, true);


--
-- Name: requirements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.requirements_id_seq', 13, true);


--
-- Name: revision_bom_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.revision_bom_items_id_seq', 6, true);


--
-- Name: revisions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.revisions_id_seq', 6, true);


--
-- Name: stock_item_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stock_item_requests_id_seq', 134, true);


--
-- Name: stock_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stock_items_id_seq', 175, true);


--
-- Name: store_request_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.store_request_items_id_seq', 13, true);


--
-- Name: store_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.store_requests_id_seq', 9, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 237, true);


--
-- Name: vendor_bids_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vendor_bids_id_seq', 1, false);


--
-- Name: vendor_demands_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vendor_demands_id_seq', 1, false);


--
-- Name: allocation_inventory_mapping allocation_inventory_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.allocation_inventory_mapping
    ADD CONSTRAINT allocation_inventory_mapping_pkey PRIMARY KEY (id);


--
-- Name: allocation_tasks allocation_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.allocation_tasks
    ADD CONSTRAINT allocation_tasks_pkey PRIMARY KEY (id);


--
-- Name: allocation_tasks allocation_tasks_qr_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.allocation_tasks
    ADD CONSTRAINT allocation_tasks_qr_number_key UNIQUE (qr_number);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: barcodes barcodes_legacy_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_legacy_unique UNIQUE (order_id, exp_date);


--
-- Name: barcodes barcodes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_pkey PRIMARY KEY (id);


--
-- Name: barcodes barcodes_po_item_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_po_item_unique UNIQUE (purchase_order_item_id, exp_date);


--
-- Name: bid_items bid_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bid_items
    ADD CONSTRAINT bid_items_pkey PRIMARY KEY (id);


--
-- Name: bill_of_materials bill_of_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_of_materials
    ADD CONSTRAINT bill_of_materials_pkey PRIMARY KEY (id);


--
-- Name: bill_of_materials bill_of_materials_project_id_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_of_materials
    ADD CONSTRAINT bill_of_materials_project_id_serial_number_key UNIQUE (project_id, serial_number);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: demand_items demand_items_demand_id_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demand_items
    ADD CONSTRAINT demand_items_demand_id_serial_number_key UNIQUE (demand_id, serial_number);


--
-- Name: demand_items demand_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demand_items
    ADD CONSTRAINT demand_items_pkey PRIMARY KEY (id);


--
-- Name: enquiries enquiries_company_enquiry_number_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_company_enquiry_number_unique UNIQUE (company_id, enquiry_number);


--
-- Name: enquiries enquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_pkey PRIMARY KEY (id);


--
-- Name: external_job_work external_job_work_external_job_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_job_work
    ADD CONSTRAINT external_job_work_external_job_id_key UNIQUE (external_job_id);


--
-- Name: external_job_work_history external_job_work_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_job_work_history
    ADD CONSTRAINT external_job_work_history_pkey PRIMARY KEY (id);


--
-- Name: external_job_work_items external_job_work_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_job_work_items
    ADD CONSTRAINT external_job_work_items_pkey PRIMARY KEY (id);


--
-- Name: external_job_work external_job_work_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_job_work
    ADD CONSTRAINT external_job_work_pkey PRIMARY KEY (id);


--
-- Name: external_jobwork_challans external_jobwork_challans_challan_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_challans
    ADD CONSTRAINT external_jobwork_challans_challan_number_key UNIQUE (challan_number);


--
-- Name: external_jobwork_challans external_jobwork_challans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_challans
    ADD CONSTRAINT external_jobwork_challans_pkey PRIMARY KEY (id);


--
-- Name: external_jobwork_inventory external_jobwork_inventory_challan_id_material_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_inventory
    ADD CONSTRAINT external_jobwork_inventory_challan_id_material_name_key UNIQUE (challan_id, material_name);


--
-- Name: external_jobwork_inventory external_jobwork_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_inventory
    ADD CONSTRAINT external_jobwork_inventory_pkey PRIMARY KEY (id);


--
-- Name: external_jobwork_material_notifications external_jobwork_material_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_material_notifications
    ADD CONSTRAINT external_jobwork_material_notifications_pkey PRIMARY KEY (id);


--
-- Name: external_jobwork_outstock_request_items external_jobwork_outstock_request_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_outstock_request_items
    ADD CONSTRAINT external_jobwork_outstock_request_items_pkey PRIMARY KEY (id);


--
-- Name: external_jobwork_outstock_requests external_jobwork_outstock_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_outstock_requests
    ADD CONSTRAINT external_jobwork_outstock_requests_pkey PRIMARY KEY (id);


--
-- Name: external_jobwork_outstock_transaction_items external_jobwork_outstock_transaction_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_outstock_transaction_items
    ADD CONSTRAINT external_jobwork_outstock_transaction_items_pkey PRIMARY KEY (id);


--
-- Name: external_jobwork_outstock_transactions external_jobwork_outstock_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_outstock_transactions
    ADD CONSTRAINT external_jobwork_outstock_transactions_pkey PRIMARY KEY (id);


--
-- Name: external_material_collections external_material_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_material_collections
    ADD CONSTRAINT external_material_collections_pkey PRIMARY KEY (id);


--
-- Name: gst_rates gst_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gst_rates
    ADD CONSTRAINT gst_rates_pkey PRIMARY KEY (id);


--
-- Name: gst_rates gst_rates_rate_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gst_rates
    ADD CONSTRAINT gst_rates_rate_key UNIQUE (rate);


--
-- Name: inventory inventory_company_id_item_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_company_id_item_name_key UNIQUE (company_id, item_name);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: job_work_images job_work_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_work_images
    ADD CONSTRAINT job_work_images_pkey PRIMARY KEY (id);


--
-- Name: job_work_items job_work_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_work_items
    ADD CONSTRAINT job_work_items_pkey PRIMARY KEY (id);


--
-- Name: job_work_requests job_work_requests_job_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_work_requests
    ADD CONSTRAINT job_work_requests_job_id_key UNIQUE (job_id);


--
-- Name: job_work_requests job_work_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_work_requests
    ADD CONSTRAINT job_work_requests_pkey PRIMARY KEY (id);


--
-- Name: jobwork_dc_items jobwork_dc_items_job_work_item_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dc_items
    ADD CONSTRAINT jobwork_dc_items_job_work_item_id_key UNIQUE (job_work_item_id);


--
-- Name: jobwork_dc_items jobwork_dc_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dc_items
    ADD CONSTRAINT jobwork_dc_items_pkey PRIMARY KEY (id);


--
-- Name: jobwork_dc_movements jobwork_dc_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dc_movements
    ADD CONSTRAINT jobwork_dc_movements_pkey PRIMARY KEY (id);


--
-- Name: jobwork_dcs jobwork_dcs_company_id_dc_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dcs
    ADD CONSTRAINT jobwork_dcs_company_id_dc_number_key UNIQUE (company_id, dc_number);


--
-- Name: jobwork_dcs jobwork_dcs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dcs
    ADD CONSTRAINT jobwork_dcs_pkey PRIMARY KEY (id);


--
-- Name: jobwork_return_items jobwork_return_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_return_items
    ADD CONSTRAINT jobwork_return_items_pkey PRIMARY KEY (id);


--
-- Name: jobwork_return_items jobwork_return_items_return_id_dc_item_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_return_items
    ADD CONSTRAINT jobwork_return_items_return_id_dc_item_id_key UNIQUE (return_id, dc_item_id);


--
-- Name: jobwork_returns jobwork_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_returns
    ADD CONSTRAINT jobwork_returns_pkey PRIMARY KEY (id);


--
-- Name: major_orders major_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.major_orders
    ADD CONSTRAINT major_orders_pkey PRIMARY KEY (id);


--
-- Name: master_materials master_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_materials
    ADD CONSTRAINT master_materials_pkey PRIMARY KEY (id);


--
-- Name: master_vendors master_vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_vendors
    ADD CONSTRAINT master_vendors_pkey PRIMARY KEY (id);


--
-- Name: material_usage_reports material_usage_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_usage_reports
    ADD CONSTRAINT material_usage_reports_pkey PRIMARY KEY (id);


--
-- Name: materials_detail materials_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_pkey PRIMARY KEY (id);


--
-- Name: minor_order_bids minor_order_bids_minor_order_id_vendor_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.minor_order_bids
    ADD CONSTRAINT minor_order_bids_minor_order_id_vendor_id_key UNIQUE (minor_order_id, vendor_id);


--
-- Name: minor_order_bids minor_order_bids_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.minor_order_bids
    ADD CONSTRAINT minor_order_bids_pkey PRIMARY KEY (id);


--
-- Name: minor_orders minor_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.minor_orders
    ADD CONSTRAINT minor_orders_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_receipt_items order_receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_receipt_items
    ADD CONSTRAINT order_receipt_items_pkey PRIMARY KEY (id);


--
-- Name: order_receipts order_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_receipts
    ADD CONSTRAINT order_receipts_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: project_internal_reports project_internal_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_internal_reports
    ADD CONSTRAINT project_internal_reports_pkey PRIMARY KEY (id);


--
-- Name: project_status_history project_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_status_history
    ADD CONSTRAINT project_status_history_pkey PRIMARY KEY (id);


--
-- Name: project_workers project_workers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_workers
    ADD CONSTRAINT project_workers_pkey PRIMARY KEY (id);


--
-- Name: project_workers project_workers_project_id_worker_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_workers
    ADD CONSTRAINT project_workers_project_id_worker_id_key UNIQUE (project_id, worker_id);


--
-- Name: projects projects_company_po_number_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_company_po_number_unique UNIQUE (company_id, po_number);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: requirement_items requirement_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requirement_items
    ADD CONSTRAINT requirement_items_pkey PRIMARY KEY (id);


--
-- Name: requirements requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_pkey PRIMARY KEY (id);


--
-- Name: revision_bom_items revision_bom_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revision_bom_items
    ADD CONSTRAINT revision_bom_items_pkey PRIMARY KEY (id);


--
-- Name: revision_bom_items revision_bom_items_revision_id_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revision_bom_items
    ADD CONSTRAINT revision_bom_items_revision_id_serial_number_key UNIQUE (revision_id, serial_number);


--
-- Name: revisions revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revisions
    ADD CONSTRAINT revisions_pkey PRIMARY KEY (id);


--
-- Name: revisions revisions_project_id_revision_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revisions
    ADD CONSTRAINT revisions_project_id_revision_number_key UNIQUE (project_id, revision_number);


--
-- Name: stock_item_requests stock_item_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_item_requests
    ADD CONSTRAINT stock_item_requests_pkey PRIMARY KEY (id);


--
-- Name: stock_items stock_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_pkey PRIMARY KEY (id);


--
-- Name: store_request_items store_request_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_request_items
    ADD CONSTRAINT store_request_items_pkey PRIMARY KEY (id);


--
-- Name: store_requests store_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_requests
    ADD CONSTRAINT store_requests_pkey PRIMARY KEY (id);


--
-- Name: project_internal_reports unique_project_phase_report; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_internal_reports
    ADD CONSTRAINT unique_project_phase_report UNIQUE (project_id, phase_name, report_index);


--
-- Name: barcodes unique_qr_number; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT unique_qr_number UNIQUE (qr_number);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vendor_bids vendor_bids_demand_id_vendor_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_bids
    ADD CONSTRAINT vendor_bids_demand_id_vendor_id_key UNIQUE (demand_id, vendor_id);


--
-- Name: vendor_bids vendor_bids_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_bids
    ADD CONSTRAINT vendor_bids_pkey PRIMARY KEY (id);


--
-- Name: vendor_demands vendor_demands_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_demands
    ADD CONSTRAINT vendor_demands_pkey PRIMARY KEY (id);


--
-- Name: idx_allocation_inventory_mapping_barcode_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_allocation_inventory_mapping_barcode_id ON public.allocation_inventory_mapping USING btree (barcode_id);


--
-- Name: idx_allocation_inventory_mapping_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_allocation_inventory_mapping_task_id ON public.allocation_inventory_mapping USING btree (allocation_task_id);


--
-- Name: idx_allocation_tasks_qr_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_allocation_tasks_qr_number ON public.allocation_tasks USING btree (qr_number);


--
-- Name: idx_allocation_tasks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_allocation_tasks_status ON public.allocation_tasks USING btree (status);


--
-- Name: idx_allocation_tasks_store_request_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_allocation_tasks_store_request_id ON public.allocation_tasks USING btree (store_request_id);


--
-- Name: idx_allocation_tasks_worker_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_allocation_tasks_worker_id ON public.allocation_tasks USING btree (worker_id);


--
-- Name: idx_attendance_company_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_company_date ON public.attendance USING btree (company_id, date);


--
-- Name: idx_attendance_user_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_user_date ON public.attendance USING btree (user_id, date);


--
-- Name: idx_barcodes_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_barcodes_company_id ON public.barcodes USING btree (company_id);


--
-- Name: idx_barcodes_item_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_barcodes_item_name ON public.barcodes USING btree (item_name);


--
-- Name: idx_barcodes_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_barcodes_order_id ON public.barcodes USING btree (order_id);


--
-- Name: idx_barcodes_purchase_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_barcodes_purchase_order_id ON public.barcodes USING btree (purchase_order_id);


--
-- Name: idx_barcodes_purchase_order_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_barcodes_purchase_order_item_id ON public.barcodes USING btree (purchase_order_item_id);


--
-- Name: idx_bid_items_bid_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bid_items_bid_id ON public.bid_items USING btree (bid_id);


--
-- Name: idx_bid_items_demand_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bid_items_demand_item_id ON public.bid_items USING btree (demand_item_id);


--
-- Name: idx_bom_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bom_project_id ON public.bill_of_materials USING btree (project_id);


--
-- Name: idx_demand_items_demand_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_demand_items_demand_id ON public.demand_items USING btree (demand_id);


--
-- Name: idx_enquiries_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_enquiries_company_id ON public.enquiries USING btree (company_id);


--
-- Name: idx_enquiries_enquiry_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_enquiries_enquiry_number ON public.enquiries USING btree (enquiry_number);


--
-- Name: idx_enquiries_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_enquiries_status ON public.enquiries USING btree (status);


--
-- Name: idx_ext_challan_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ext_challan_company ON public.external_jobwork_challans USING btree (company_id);


--
-- Name: idx_ext_challan_job_work; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ext_challan_job_work ON public.external_jobwork_challans USING btree (job_work_id);


--
-- Name: idx_ext_challan_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ext_challan_status ON public.external_jobwork_challans USING btree (challan_status);


--
-- Name: idx_ext_inventory_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ext_inventory_company ON public.external_jobwork_inventory USING btree (company_id);


--
-- Name: idx_ext_inventory_job_work; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ext_inventory_job_work ON public.external_jobwork_inventory USING btree (job_work_id);


--
-- Name: idx_ext_notif_accountant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ext_notif_accountant ON public.external_jobwork_material_notifications USING btree (accountant_id);


--
-- Name: idx_ext_notif_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ext_notif_company ON public.external_jobwork_material_notifications USING btree (company_id);


--
-- Name: idx_ext_notif_job_work; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ext_notif_job_work ON public.external_jobwork_material_notifications USING btree (job_work_id);


--
-- Name: idx_external_job_work_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_external_job_work_assigned_to ON public.external_job_work USING btree (assigned_to);


--
-- Name: idx_external_job_work_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_external_job_work_company_id ON public.external_job_work USING btree (company_id);


--
-- Name: idx_external_job_work_history_changed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_external_job_work_history_changed_at ON public.external_job_work_history USING btree (changed_at);


--
-- Name: idx_external_job_work_history_job_work_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_external_job_work_history_job_work_id ON public.external_job_work_history USING btree (job_work_id);


--
-- Name: idx_external_job_work_items_job_work_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_external_job_work_items_job_work_id ON public.external_job_work_items USING btree (job_work_id);


--
-- Name: idx_external_job_work_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_external_job_work_status ON public.external_job_work USING btree (status);


--
-- Name: idx_external_request_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_external_request_company ON public.external_jobwork_outstock_requests USING btree (company_id);


--
-- Name: idx_external_request_items; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_external_request_items ON public.external_jobwork_outstock_request_items USING btree (request_id);


--
-- Name: idx_external_request_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_external_request_project ON public.external_jobwork_outstock_requests USING btree (project_id);


--
-- Name: idx_external_request_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_external_request_status ON public.external_jobwork_outstock_requests USING btree (status);


--
-- Name: idx_external_request_worker; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_external_request_worker ON public.external_jobwork_outstock_requests USING btree (worker_id);


--
-- Name: idx_external_transaction_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_external_transaction_company ON public.external_jobwork_outstock_transactions USING btree (company_id);


--
-- Name: idx_external_transaction_issued_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_external_transaction_issued_by ON public.external_jobwork_outstock_transactions USING btree (issued_by);


--
-- Name: idx_external_transaction_items; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_external_transaction_items ON public.external_jobwork_outstock_transaction_items USING btree (transaction_id);


--
-- Name: idx_external_transaction_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_external_transaction_project ON public.external_jobwork_outstock_transactions USING btree (project_id);


--
-- Name: idx_external_transaction_worker; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_external_transaction_worker ON public.external_jobwork_outstock_transactions USING btree (worker_id);


--
-- Name: idx_inventory_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_company_id ON public.inventory USING btree (company_id);


--
-- Name: idx_job_work_images_request; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_work_images_request ON public.job_work_images USING btree (job_work_id);


--
-- Name: idx_job_work_items_bom_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_work_items_bom_item ON public.job_work_items USING btree (bom_item_id) WHERE (bom_item_id IS NOT NULL);


--
-- Name: idx_job_work_items_request; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_work_items_request ON public.job_work_items USING btree (job_work_id);


--
-- Name: idx_job_work_items_revision_bom_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_work_items_revision_bom_item ON public.job_work_items USING btree (revision_bom_item_id) WHERE (revision_bom_item_id IS NOT NULL);


--
-- Name: idx_job_work_requests_accountant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_work_requests_accountant ON public.job_work_requests USING btree (accountant_id);


--
-- Name: idx_job_work_requests_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_work_requests_company ON public.job_work_requests USING btree (company_id);


--
-- Name: idx_job_work_requests_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_work_requests_project ON public.job_work_requests USING btree (project_id);


--
-- Name: idx_jobwork_dc_items_dc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobwork_dc_items_dc ON public.jobwork_dc_items USING btree (dc_id);


--
-- Name: idx_jobwork_dc_movements_dc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobwork_dc_movements_dc ON public.jobwork_dc_movements USING btree (dc_id);


--
-- Name: idx_jobwork_dc_movements_to_vendor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobwork_dc_movements_to_vendor ON public.jobwork_dc_movements USING btree (to_vendor_id);


--
-- Name: idx_jobwork_dcs_company_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobwork_dcs_company_status ON public.jobwork_dcs USING btree (company_id, status);


--
-- Name: idx_jobwork_dcs_current_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobwork_dcs_current_location ON public.jobwork_dcs USING btree (current_location_vendor_id);


--
-- Name: idx_jobwork_dcs_vendor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobwork_dcs_vendor ON public.jobwork_dcs USING btree (vendor_id);


--
-- Name: idx_jobwork_returns_dc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobwork_returns_dc ON public.jobwork_returns USING btree (dc_id);


--
-- Name: idx_major_orders_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_major_orders_company_id ON public.major_orders USING btree (company_id);


--
-- Name: idx_major_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_major_orders_status ON public.major_orders USING btree (status);


--
-- Name: idx_major_orders_vendor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_major_orders_vendor_id ON public.major_orders USING btree (vendor_id);


--
-- Name: idx_master_materials_business_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_master_materials_business_name ON public.master_materials USING btree (business_name);


--
-- Name: idx_master_vendors_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_master_vendors_name ON public.master_vendors USING btree (name);


--
-- Name: idx_materials_detail_bid_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_materials_detail_bid_id ON public.materials_detail USING btree (bid_id);


--
-- Name: idx_materials_detail_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_materials_detail_company_id ON public.materials_detail USING btree (company_id);


--
-- Name: idx_materials_detail_demand_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_materials_detail_demand_id ON public.materials_detail USING btree (demand_id);


--
-- Name: idx_materials_detail_demand_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_materials_detail_demand_item_id ON public.materials_detail USING btree (demand_item_id);


--
-- Name: idx_materials_detail_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_materials_detail_status ON public.materials_detail USING btree (status);


--
-- Name: idx_materials_detail_unique_demand_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_materials_detail_unique_demand_item ON public.materials_detail USING btree (demand_item_id) WHERE (demand_item_id IS NOT NULL);


--
-- Name: idx_materials_detail_vendor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_materials_detail_vendor_id ON public.materials_detail USING btree (vendor_id);


--
-- Name: idx_minor_order_bids_minor_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_minor_order_bids_minor_order_id ON public.minor_order_bids USING btree (minor_order_id);


--
-- Name: idx_minor_order_bids_vendor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_minor_order_bids_vendor_id ON public.minor_order_bids USING btree (vendor_id);


--
-- Name: idx_minor_orders_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_minor_orders_company_id ON public.minor_orders USING btree (company_id);


--
-- Name: idx_minor_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_minor_orders_status ON public.minor_orders USING btree (status);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_order_receipt_items_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_receipt_items_order_id ON public.order_receipt_items USING btree (order_id);


--
-- Name: idx_order_receipt_items_purchase_order_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_receipt_items_purchase_order_item_id ON public.order_receipt_items USING btree (purchase_order_item_id);


--
-- Name: idx_order_receipt_items_receipt_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_receipt_items_receipt_id ON public.order_receipt_items USING btree (receipt_id);


--
-- Name: idx_order_receipts_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_receipts_company_id ON public.order_receipts USING btree (company_id);


--
-- Name: idx_order_receipts_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_receipts_order_id ON public.order_receipts USING btree (order_id);


--
-- Name: idx_order_receipts_purchase_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_receipts_purchase_order_id ON public.order_receipts USING btree (purchase_order_id);


--
-- Name: idx_order_receipts_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_receipts_status ON public.order_receipts USING btree (status);


--
-- Name: idx_orders_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_company_id ON public.orders USING btree (company_id);


--
-- Name: idx_password_reset_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_project_workers_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_workers_project_id ON public.project_workers USING btree (project_id);


--
-- Name: idx_project_workers_worker_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_workers_worker_id ON public.project_workers USING btree (worker_id);


--
-- Name: idx_projects_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_company_id ON public.projects USING btree (company_id);


--
-- Name: idx_projects_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_created_by ON public.projects USING btree (created_by);


--
-- Name: idx_purchase_order_items_po_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_order_items_po_id ON public.purchase_order_items USING btree (po_id);


--
-- Name: idx_purchase_orders_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_orders_company_id ON public.purchase_orders USING btree (company_id);


--
-- Name: idx_purchase_orders_vendor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_orders_vendor_id ON public.purchase_orders USING btree (master_vendor_id);


--
-- Name: idx_revision_bom_revision_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_revision_bom_revision_id ON public.revision_bom_items USING btree (revision_id);


--
-- Name: idx_revision_bom_serial; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_revision_bom_serial ON public.revision_bom_items USING btree (revision_id, serial_number);


--
-- Name: idx_revisions_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_revisions_project_id ON public.revisions USING btree (project_id);


--
-- Name: idx_revisions_revision_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_revisions_revision_number ON public.revisions USING btree (project_id, revision_number);


--
-- Name: idx_status_history_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_status_history_project_id ON public.project_status_history USING btree (project_id);


--
-- Name: idx_stock_item_requests_company_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_item_requests_company_status ON public.stock_item_requests USING btree (company_id, status);


--
-- Name: idx_stock_item_requests_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_item_requests_item ON public.stock_item_requests USING btree (job_work_item_id);


--
-- Name: idx_store_requests_allocated_to_worker; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_store_requests_allocated_to_worker ON public.store_requests USING btree (allocated_to_worker_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_vendor_bids_demand_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendor_bids_demand_id ON public.vendor_bids USING btree (demand_id);


--
-- Name: idx_vendor_bids_vendor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendor_bids_vendor_id ON public.vendor_bids USING btree (vendor_id);


--
-- Name: idx_vendor_demands_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendor_demands_company_id ON public.vendor_demands USING btree (company_id);


--
-- Name: idx_vendor_demands_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendor_demands_created_by ON public.vendor_demands USING btree (created_by);


--
-- Name: idx_vendor_demands_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendor_demands_status ON public.vendor_demands USING btree (status);


--
-- Name: uq_stock_item_requests_pending_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_stock_item_requests_pending_name ON public.stock_item_requests USING btree (company_id, lower((requested_name)::text)) WHERE ((status)::text = 'pending'::text);


--
-- Name: uq_stock_items_company_lower_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_stock_items_company_lower_name ON public.stock_items USING btree (company_id, lower((name)::text));


--
-- Name: allocation_inventory_mapping allocation_inventory_mapping_allocation_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.allocation_inventory_mapping
    ADD CONSTRAINT allocation_inventory_mapping_allocation_task_id_fkey FOREIGN KEY (allocation_task_id) REFERENCES public.allocation_tasks(id) ON DELETE CASCADE;


--
-- Name: allocation_inventory_mapping allocation_inventory_mapping_barcode_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.allocation_inventory_mapping
    ADD CONSTRAINT allocation_inventory_mapping_barcode_id_fkey FOREIGN KEY (barcode_id) REFERENCES public.barcodes(id) ON DELETE CASCADE;


--
-- Name: allocation_tasks allocation_tasks_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.allocation_tasks
    ADD CONSTRAINT allocation_tasks_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.users(id);


--
-- Name: allocation_tasks allocation_tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.allocation_tasks
    ADD CONSTRAINT allocation_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: allocation_tasks allocation_tasks_store_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.allocation_tasks
    ADD CONSTRAINT allocation_tasks_store_request_id_fkey FOREIGN KEY (store_request_id) REFERENCES public.store_requests(id) ON DELETE CASCADE;


--
-- Name: allocation_tasks allocation_tasks_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.allocation_tasks
    ADD CONSTRAINT allocation_tasks_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.users(id);


--
-- Name: attendance attendance_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: barcodes barcodes_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: barcodes barcodes_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.major_orders(id) ON DELETE CASCADE;


--
-- Name: barcodes barcodes_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: barcodes barcodes_purchase_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barcodes
    ADD CONSTRAINT barcodes_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES public.purchase_order_items(id) ON DELETE CASCADE;


--
-- Name: bid_items bid_items_bid_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bid_items
    ADD CONSTRAINT bid_items_bid_id_fkey FOREIGN KEY (bid_id) REFERENCES public.vendor_bids(id) ON DELETE CASCADE;


--
-- Name: bid_items bid_items_demand_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bid_items
    ADD CONSTRAINT bid_items_demand_item_id_fkey FOREIGN KEY (demand_item_id) REFERENCES public.demand_items(id) ON DELETE CASCADE;


--
-- Name: bill_of_materials bill_of_materials_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_of_materials
    ADD CONSTRAINT bill_of_materials_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: demand_items demand_items_demand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demand_items
    ADD CONSTRAINT demand_items_demand_id_fkey FOREIGN KEY (demand_id) REFERENCES public.vendor_demands(id) ON DELETE CASCADE;


--
-- Name: enquiries enquiries_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: enquiries enquiries_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: enquiries enquiries_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: external_job_work external_job_work_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_job_work
    ADD CONSTRAINT external_job_work_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: external_job_work external_job_work_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_job_work
    ADD CONSTRAINT external_job_work_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: external_job_work external_job_work_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_job_work
    ADD CONSTRAINT external_job_work_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: external_job_work external_job_work_enquiry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_job_work
    ADD CONSTRAINT external_job_work_enquiry_id_fkey FOREIGN KEY (enquiry_id) REFERENCES public.enquiries(id);


--
-- Name: external_job_work_history external_job_work_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_job_work_history
    ADD CONSTRAINT external_job_work_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: external_job_work_history external_job_work_history_job_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_job_work_history
    ADD CONSTRAINT external_job_work_history_job_work_id_fkey FOREIGN KEY (job_work_id) REFERENCES public.external_job_work(id) ON DELETE CASCADE;


--
-- Name: external_job_work_items external_job_work_items_job_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_job_work_items
    ADD CONSTRAINT external_job_work_items_job_work_id_fkey FOREIGN KEY (job_work_id) REFERENCES public.external_job_work(id) ON DELETE CASCADE;


--
-- Name: external_jobwork_challans external_jobwork_challans_accountant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_challans
    ADD CONSTRAINT external_jobwork_challans_accountant_id_fkey FOREIGN KEY (accountant_id) REFERENCES public.users(id);


--
-- Name: external_jobwork_challans external_jobwork_challans_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_challans
    ADD CONSTRAINT external_jobwork_challans_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: external_jobwork_challans external_jobwork_challans_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_challans
    ADD CONSTRAINT external_jobwork_challans_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.external_jobwork_material_notifications(id) ON DELETE CASCADE;


--
-- Name: external_jobwork_challans external_jobwork_challans_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_challans
    ADD CONSTRAINT external_jobwork_challans_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id);


--
-- Name: external_jobwork_challans external_jobwork_challans_store_incharge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_challans
    ADD CONSTRAINT external_jobwork_challans_store_incharge_id_fkey FOREIGN KEY (store_incharge_id) REFERENCES public.users(id);


--
-- Name: external_jobwork_inventory external_jobwork_inventory_challan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_inventory
    ADD CONSTRAINT external_jobwork_inventory_challan_id_fkey FOREIGN KEY (challan_id) REFERENCES public.external_jobwork_challans(id) ON DELETE CASCADE;


--
-- Name: external_jobwork_inventory external_jobwork_inventory_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_inventory
    ADD CONSTRAINT external_jobwork_inventory_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: external_jobwork_inventory external_jobwork_inventory_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_inventory
    ADD CONSTRAINT external_jobwork_inventory_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id);


--
-- Name: external_jobwork_material_notifications external_jobwork_material_notifications_accountant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_material_notifications
    ADD CONSTRAINT external_jobwork_material_notifications_accountant_id_fkey FOREIGN KEY (accountant_id) REFERENCES public.users(id);


--
-- Name: external_jobwork_material_notifications external_jobwork_material_notifications_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_material_notifications
    ADD CONSTRAINT external_jobwork_material_notifications_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: external_jobwork_material_notifications external_jobwork_material_notifications_npd_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_material_notifications
    ADD CONSTRAINT external_jobwork_material_notifications_npd_user_id_fkey FOREIGN KEY (npd_user_id) REFERENCES public.users(id);


--
-- Name: external_jobwork_outstock_request_items external_jobwork_outstock_request_items_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_outstock_request_items
    ADD CONSTRAINT external_jobwork_outstock_request_items_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.external_jobwork_outstock_requests(id) ON DELETE CASCADE;


--
-- Name: external_jobwork_outstock_requests external_jobwork_outstock_requests_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_outstock_requests
    ADD CONSTRAINT external_jobwork_outstock_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: external_jobwork_outstock_requests external_jobwork_outstock_requests_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_outstock_requests
    ADD CONSTRAINT external_jobwork_outstock_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: external_jobwork_outstock_requests external_jobwork_outstock_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_outstock_requests
    ADD CONSTRAINT external_jobwork_outstock_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: external_jobwork_outstock_requests external_jobwork_outstock_requests_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_outstock_requests
    ADD CONSTRAINT external_jobwork_outstock_requests_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.users(id);


--
-- Name: external_jobwork_outstock_transaction_items external_jobwork_outstock_transaction_items_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_outstock_transaction_items
    ADD CONSTRAINT external_jobwork_outstock_transaction_items_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.external_jobwork_outstock_transactions(id) ON DELETE CASCADE;


--
-- Name: external_jobwork_outstock_transactions external_jobwork_outstock_transactions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_outstock_transactions
    ADD CONSTRAINT external_jobwork_outstock_transactions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: external_jobwork_outstock_transactions external_jobwork_outstock_transactions_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_outstock_transactions
    ADD CONSTRAINT external_jobwork_outstock_transactions_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.users(id);


--
-- Name: external_jobwork_outstock_transactions external_jobwork_outstock_transactions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_outstock_transactions
    ADD CONSTRAINT external_jobwork_outstock_transactions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: external_jobwork_outstock_transactions external_jobwork_outstock_transactions_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_outstock_transactions
    ADD CONSTRAINT external_jobwork_outstock_transactions_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.external_jobwork_outstock_requests(id);


--
-- Name: external_jobwork_outstock_transactions external_jobwork_outstock_transactions_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_jobwork_outstock_transactions
    ADD CONSTRAINT external_jobwork_outstock_transactions_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.users(id);


--
-- Name: external_material_collections external_material_collections_collected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_material_collections
    ADD CONSTRAINT external_material_collections_collected_by_fkey FOREIGN KEY (collected_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: external_material_collections external_material_collections_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.external_material_collections
    ADD CONSTRAINT external_material_collections_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.external_jobwork_outstock_requests(id) ON DELETE CASCADE;


--
-- Name: inventory inventory_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: job_work_images job_work_images_job_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_work_images
    ADD CONSTRAINT job_work_images_job_work_id_fkey FOREIGN KEY (job_work_id) REFERENCES public.job_work_requests(id) ON DELETE CASCADE;


--
-- Name: job_work_items job_work_items_bom_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_work_items
    ADD CONSTRAINT job_work_items_bom_item_id_fkey FOREIGN KEY (bom_item_id) REFERENCES public.bill_of_materials(id) ON DELETE SET NULL;


--
-- Name: job_work_items job_work_items_job_work_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_work_items
    ADD CONSTRAINT job_work_items_job_work_id_fkey FOREIGN KEY (job_work_id) REFERENCES public.job_work_requests(id) ON DELETE CASCADE;


--
-- Name: job_work_items job_work_items_revision_bom_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_work_items
    ADD CONSTRAINT job_work_items_revision_bom_item_id_fkey FOREIGN KEY (revision_bom_item_id) REFERENCES public.revision_bom_items(id) ON DELETE SET NULL;


--
-- Name: job_work_items job_work_items_stock_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_work_items
    ADD CONSTRAINT job_work_items_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id) ON DELETE SET NULL;


--
-- Name: job_work_requests job_work_requests_accountant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_work_requests
    ADD CONSTRAINT job_work_requests_accountant_id_fkey FOREIGN KEY (accountant_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: job_work_requests job_work_requests_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_work_requests
    ADD CONSTRAINT job_work_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: job_work_requests job_work_requests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_work_requests
    ADD CONSTRAINT job_work_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: job_work_requests job_work_requests_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_work_requests
    ADD CONSTRAINT job_work_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: job_work_requests job_work_requests_store_incharge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_work_requests
    ADD CONSTRAINT job_work_requests_store_incharge_id_fkey FOREIGN KEY (store_incharge_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: jobwork_dc_items jobwork_dc_items_dc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dc_items
    ADD CONSTRAINT jobwork_dc_items_dc_id_fkey FOREIGN KEY (dc_id) REFERENCES public.jobwork_dcs(id) ON DELETE CASCADE;


--
-- Name: jobwork_dc_items jobwork_dc_items_job_work_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dc_items
    ADD CONSTRAINT jobwork_dc_items_job_work_item_id_fkey FOREIGN KEY (job_work_item_id) REFERENCES public.job_work_items(id);


--
-- Name: jobwork_dc_items jobwork_dc_items_stock_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dc_items
    ADD CONSTRAINT jobwork_dc_items_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id);


--
-- Name: jobwork_dc_movements jobwork_dc_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dc_movements
    ADD CONSTRAINT jobwork_dc_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: jobwork_dc_movements jobwork_dc_movements_dc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dc_movements
    ADD CONSTRAINT jobwork_dc_movements_dc_id_fkey FOREIGN KEY (dc_id) REFERENCES public.jobwork_dcs(id) ON DELETE CASCADE;


--
-- Name: jobwork_dc_movements jobwork_dc_movements_from_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dc_movements
    ADD CONSTRAINT jobwork_dc_movements_from_vendor_id_fkey FOREIGN KEY (from_vendor_id) REFERENCES public.master_vendors(id);


--
-- Name: jobwork_dc_movements jobwork_dc_movements_to_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dc_movements
    ADD CONSTRAINT jobwork_dc_movements_to_vendor_id_fkey FOREIGN KEY (to_vendor_id) REFERENCES public.master_vendors(id);


--
-- Name: jobwork_dcs jobwork_dcs_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dcs
    ADD CONSTRAINT jobwork_dcs_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: jobwork_dcs jobwork_dcs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dcs
    ADD CONSTRAINT jobwork_dcs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: jobwork_dcs jobwork_dcs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dcs
    ADD CONSTRAINT jobwork_dcs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: jobwork_dcs jobwork_dcs_current_location_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dcs
    ADD CONSTRAINT jobwork_dcs_current_location_vendor_id_fkey FOREIGN KEY (current_location_vendor_id) REFERENCES public.master_vendors(id);


--
-- Name: jobwork_dcs jobwork_dcs_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_dcs
    ADD CONSTRAINT jobwork_dcs_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.master_vendors(id);


--
-- Name: jobwork_return_items jobwork_return_items_dc_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_return_items
    ADD CONSTRAINT jobwork_return_items_dc_item_id_fkey FOREIGN KEY (dc_item_id) REFERENCES public.jobwork_dc_items(id);


--
-- Name: jobwork_return_items jobwork_return_items_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_return_items
    ADD CONSTRAINT jobwork_return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.jobwork_returns(id) ON DELETE CASCADE;


--
-- Name: jobwork_returns jobwork_returns_dc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_returns
    ADD CONSTRAINT jobwork_returns_dc_id_fkey FOREIGN KEY (dc_id) REFERENCES public.jobwork_dcs(id) ON DELETE CASCADE;


--
-- Name: jobwork_returns jobwork_returns_gst_rate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_returns
    ADD CONSTRAINT jobwork_returns_gst_rate_id_fkey FOREIGN KEY (gst_rate_id) REFERENCES public.gst_rates(id);


--
-- Name: jobwork_returns jobwork_returns_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_returns
    ADD CONSTRAINT jobwork_returns_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: jobwork_returns jobwork_returns_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobwork_returns
    ADD CONSTRAINT jobwork_returns_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.master_vendors(id);


--
-- Name: major_orders major_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.major_orders
    ADD CONSTRAINT major_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: major_orders major_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.major_orders
    ADD CONSTRAINT major_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: major_orders major_orders_materials_detail_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.major_orders
    ADD CONSTRAINT major_orders_materials_detail_id_fkey FOREIGN KEY (materials_detail_id) REFERENCES public.materials_detail(id) ON DELETE SET NULL;


--
-- Name: major_orders major_orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.major_orders
    ADD CONSTRAINT major_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.users(id);


--
-- Name: master_materials master_materials_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_materials
    ADD CONSTRAINT master_materials_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: master_vendors master_vendors_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_vendors
    ADD CONSTRAINT master_vendors_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: material_usage_reports material_usage_reports_accountant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_usage_reports
    ADD CONSTRAINT material_usage_reports_accountant_id_fkey FOREIGN KEY (accountant_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: material_usage_reports material_usage_reports_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_usage_reports
    ADD CONSTRAINT material_usage_reports_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: materials_detail materials_detail_bid_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_bid_id_fkey FOREIGN KEY (bid_id) REFERENCES public.vendor_bids(id) ON DELETE SET NULL;


--
-- Name: materials_detail materials_detail_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: materials_detail materials_detail_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: materials_detail materials_detail_demand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_demand_id_fkey FOREIGN KEY (demand_id) REFERENCES public.vendor_demands(id) ON DELETE SET NULL;


--
-- Name: materials_detail materials_detail_demand_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_demand_item_id_fkey FOREIGN KEY (demand_item_id) REFERENCES public.demand_items(id) ON DELETE SET NULL;


--
-- Name: materials_detail materials_detail_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials_detail
    ADD CONSTRAINT materials_detail_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: minor_order_bids minor_order_bids_minor_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.minor_order_bids
    ADD CONSTRAINT minor_order_bids_minor_order_id_fkey FOREIGN KEY (minor_order_id) REFERENCES public.minor_orders(id) ON DELETE CASCADE;


--
-- Name: minor_order_bids minor_order_bids_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.minor_order_bids
    ADD CONSTRAINT minor_order_bids_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.users(id);


--
-- Name: minor_orders minor_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.minor_orders
    ADD CONSTRAINT minor_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: minor_orders minor_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.minor_orders
    ADD CONSTRAINT minor_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: minor_orders minor_orders_selected_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.minor_orders
    ADD CONSTRAINT minor_orders_selected_vendor_id_fkey FOREIGN KEY (selected_vendor_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_receipt_items order_receipt_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_receipt_items
    ADD CONSTRAINT order_receipt_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.major_orders(id) ON DELETE CASCADE;


--
-- Name: order_receipt_items order_receipt_items_purchase_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_receipt_items
    ADD CONSTRAINT order_receipt_items_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES public.purchase_order_items(id) ON DELETE CASCADE;


--
-- Name: order_receipt_items order_receipt_items_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_receipt_items
    ADD CONSTRAINT order_receipt_items_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.order_receipts(id) ON DELETE CASCADE;


--
-- Name: order_receipts order_receipts_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_receipts
    ADD CONSTRAINT order_receipts_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: order_receipts order_receipts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_receipts
    ADD CONSTRAINT order_receipts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: order_receipts order_receipts_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_receipts
    ADD CONSTRAINT order_receipts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.major_orders(id) ON DELETE CASCADE;


--
-- Name: order_receipts order_receipts_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_receipts
    ADD CONSTRAINT order_receipts_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: order_receipts order_receipts_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_receipts
    ADD CONSTRAINT order_receipts_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: orders orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: orders orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: project_internal_reports project_internal_reports_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_internal_reports
    ADD CONSTRAINT project_internal_reports_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_internal_reports project_internal_reports_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_internal_reports
    ADD CONSTRAINT project_internal_reports_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: project_status_history project_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_status_history
    ADD CONSTRAINT project_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: project_status_history project_status_history_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_status_history
    ADD CONSTRAINT project_status_history_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_workers project_workers_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_workers
    ADD CONSTRAINT project_workers_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: project_workers project_workers_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_workers
    ADD CONSTRAINT project_workers_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_workers project_workers_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_workers
    ADD CONSTRAINT project_workers_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: projects projects_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: projects projects_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: projects projects_npd_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_npd_user_id_fkey FOREIGN KEY (npd_user_id) REFERENCES public.users(id);


--
-- Name: projects projects_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: purchase_order_items purchase_order_items_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_master_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_master_vendor_id_fkey FOREIGN KEY (master_vendor_id) REFERENCES public.master_vendors(id);


--
-- Name: requirement_items requirement_items_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requirement_items
    ADD CONSTRAINT requirement_items_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;


--
-- Name: requirements requirements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: requirements requirements_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: requirements requirements_sent_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_sent_to_fkey FOREIGN KEY (sent_to) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: revision_bom_items revision_bom_items_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revision_bom_items
    ADD CONSTRAINT revision_bom_items_revision_id_fkey FOREIGN KEY (revision_id) REFERENCES public.revisions(id) ON DELETE CASCADE;


--
-- Name: revisions revisions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revisions
    ADD CONSTRAINT revisions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: revisions revisions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revisions
    ADD CONSTRAINT revisions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: stock_item_requests stock_item_requests_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_item_requests
    ADD CONSTRAINT stock_item_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: stock_item_requests stock_item_requests_dc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_item_requests
    ADD CONSTRAINT stock_item_requests_dc_id_fkey FOREIGN KEY (dc_id) REFERENCES public.jobwork_dcs(id) ON DELETE SET NULL;


--
-- Name: stock_item_requests stock_item_requests_job_work_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_item_requests
    ADD CONSTRAINT stock_item_requests_job_work_item_id_fkey FOREIGN KEY (job_work_item_id) REFERENCES public.job_work_items(id) ON DELETE SET NULL;


--
-- Name: stock_item_requests stock_item_requests_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_item_requests
    ADD CONSTRAINT stock_item_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: stock_item_requests stock_item_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_item_requests
    ADD CONSTRAINT stock_item_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stock_item_requests stock_item_requests_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_item_requests
    ADD CONSTRAINT stock_item_requests_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stock_item_requests stock_item_requests_stock_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_item_requests
    ADD CONSTRAINT stock_item_requests_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id) ON DELETE SET NULL;


--
-- Name: stock_items stock_items_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: stock_items stock_items_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: store_request_items store_request_items_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_request_items
    ADD CONSTRAINT store_request_items_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.store_requests(id) ON DELETE CASCADE;


--
-- Name: store_requests store_requests_allocated_to_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_requests
    ADD CONSTRAINT store_requests_allocated_to_worker_id_fkey FOREIGN KEY (allocated_to_worker_id) REFERENCES public.users(id);


--
-- Name: store_requests store_requests_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_requests
    ADD CONSTRAINT store_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: store_requests store_requests_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_requests
    ADD CONSTRAINT store_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: store_requests store_requests_project_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_requests
    ADD CONSTRAINT store_requests_project_manager_id_fkey FOREIGN KEY (project_manager_id) REFERENCES public.users(id);


--
-- Name: store_requests store_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_requests
    ADD CONSTRAINT store_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: store_requests store_requests_responded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_requests
    ADD CONSTRAINT store_requests_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES public.users(id);


--
-- Name: users users_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: users users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: vendor_bids vendor_bids_demand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_bids
    ADD CONSTRAINT vendor_bids_demand_id_fkey FOREIGN KEY (demand_id) REFERENCES public.vendor_demands(id) ON DELETE CASCADE;


--
-- Name: vendor_bids vendor_bids_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_bids
    ADD CONSTRAINT vendor_bids_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.users(id);


--
-- Name: vendor_demands vendor_demands_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_demands
    ADD CONSTRAINT vendor_demands_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: vendor_demands vendor_demands_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_demands
    ADD CONSTRAINT vendor_demands_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict YlnXdrrmj1Yq3xyKIfLuqouCieva73QVcwiyCLfRRIBu9xfFtuuV7kMlaMOSHc5


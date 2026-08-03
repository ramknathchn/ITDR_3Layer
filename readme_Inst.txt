================================================================================
ITDR 3-LAYER PLATFORM: AGENT & DEVELOPER VS CODE INSTALLATION GUIDE
================================================================================
Document File: readme_Inst.txt
Target Environment: Visual Studio Code (VS Code) / Windows / Linux / macOS
Target Audience: AI Coding Agents & Systems Engineers
Platform: ITDR Shield - Identity Threat Detection & Response Platform
================================================================================

--------------------------------------------------------------------------------
1. EXECUTIVE DIRECTIVE FOR AI AGENTS & DEVELOPERS
--------------------------------------------------------------------------------
This document provides exact, autonomous instructions for setting up, configuring, 
initializing the database, and running the ITDR 3-Layer Platform inside VS Code. 

CRITICAL REQUIREMENT AT STARTUP:
The installer/agent MUST choose the Database Engine option before starting the app:
  • OPTION 1: SQLite 3 Database (Default - Portable, 0-config, no server required)
  • OPTION 2: Microsoft SQL Server (Enterprise RDBMS)

--------------------------------------------------------------------------------
2. PREREQUISITES & VS CODE EXTENSIONS
--------------------------------------------------------------------------------
1. Software Prerequisites:
   • Python 3.10 or higher
   • Git (optional, for repo cloning)
   • Microsoft ODBC Driver 17 for SQL Server (Required ONLY if choosing SQL Server)

2. Recommended VS Code Extensions:
   • Python (Extension ID: ms-python.python)
   • Pylance (Extension ID: ms-python.vscode-pylance)
   • REST Client (Extension ID: humao.rest-client)

--------------------------------------------------------------------------------
3. STEP-BY-STEP SETUP WORKFLOW IN VS CODE
--------------------------------------------------------------------------------

STEP 3.1: Open Project in VS Code
---------------------------------
Open the project directory in VS Code terminal:
  code C:\antiProjects\BCKUP\ITDR_3Layer

STEP 3.2: Create & Activate Virtual Environment
-----------------------------------------------
Open VS Code PowerShell terminal (`Ctrl + ~`) and run:

  python -m venv venv
  .\venv\Scripts\Activate.ps1

STEP 3.3: Install Required Dependencies
---------------------------------------
Install all required Python backend dependencies:

  pip install fastapi uvicorn pyodbc pydantic requests

--------------------------------------------------------------------------------
4. DATABASE ENGINE SELECTION & INITIALIZATION (MUST CHOOSE AT START)
--------------------------------------------------------------------------------

Choose ONE of the following database options depending on deployment requirements:

--------------------------------------------------------------------------------
OPTION 1: SQLITE 3 DATABASE (RECOMMENDED FOR FAST/PORTABLE SETUP)
--------------------------------------------------------------------------------
• Engine: Embedded SQLite 3 (Database file: backend/itdr_3layer.db)
• Configuration Command:
  $env:DB_ENGINE="sqlite"

• Initialization Command (Executes DDL & imports 2,685 records from JSON dumps):
  python -m backend.db.sqlite_loader

• Execution Result: Creates [backend/itdr_3layer.db] with 31 tables populated cleanly.

--------------------------------------------------------------------------------
OPTION 2: MICROSOFT SQL SERVER (FOR ENTERPRISE DEPLOYMENT)
--------------------------------------------------------------------------------
• Engine: SQL Server RDBMS
• Configuration Commands:
  $env:DB_ENGINE="sqlserver"
  $env:SQL_SERVER_NAME="DESKTOP-DULJ3LT\SS2025NM"  # Replace with target SQL Server
  $env:SQL_DB_NAME="ITDR"

• Initialization Command (Executes DDL & seeds 24+ SQL Server tables):
  python -m backend.db.data_loader

--------------------------------------------------------------------------------
5. TOPOLOGY BUILDER & GRAPH STORE INITIALIZATION
--------------------------------------------------------------------------------
After initializing your chosen database, run the standalone topology builder to 
construct graph nodes and 5-hop recursive CTE edges:

  python -m backend.db.sql_topology_builder --generate-json

This populates tables [sql_topology_nodes] and [security_blast_radius_edges] and 
generates the graph file [backend/data/sample_feeds/bank_topology.json].

--------------------------------------------------------------------------------
6. RUNNING THE APPLICATION IN VS CODE
--------------------------------------------------------------------------------

Launch the FastAPI & Uvicorn backend server from VS Code terminal:

  python -m uvicorn backend.app:app --host 0.0.0.0 --port 8001

The application will start on:
  • Web UI Endpoint:  http://localhost:8001/static/index.html
  • API Swagger Docs: http://localhost:8001/docs
  • Health Check API: http://localhost:8001/api/health

--------------------------------------------------------------------------------
7. VERIFICATION & API TESTING FOR AGENTS
--------------------------------------------------------------------------------

1. Verify Health Check via PowerShell:
   python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8001/api/health').read().decode())"

2. Verify Direct Formatted LLM JSON Ingestion (Offline LLM Fallback):
   python -c "import urllib.request, json; data = json.dumps({'bulletin_json': {'bulletin_id': 'TB-MANUAL-TEST-001', 'title': 'Test Ingest', 'severity': 'CRITICAL', 'mitre_techniques': ['T1078.004']}, 'analysis_path': 'standard'}).encode('utf-8'); req = urllib.request.Request('http://127.0.0.1:8001/api/ingest/threat-bulletin-json', data=data, headers={'Content-Type': 'application/json'}); print(urllib.request.urlopen(req).read().decode()[:200])"

--------------------------------------------------------------------------------
8. ARCHITECTURE & SPECIFICATION REFERENCES IN WORKSPACE
--------------------------------------------------------------------------------
  • Readme.txt                                - Master Architecture (Sections 1 - 17)
  • BankTopologyCreator.html                  - Bank Topology Construction Guide
  • Blast_Radius_flow.html                    - 5-Hop Layer Traversal & SVG Flowcharts
  • ALL_DATASource_and_USAGE.html             - 13 Telemetry Sources Reference
  • ITDR_Blast_Radius_Engines_Architecture.html - 3 Blast Radius Engines Spec
================================================================================

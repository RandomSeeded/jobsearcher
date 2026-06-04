.PHONY: promote shelve persist-company log

REPO_ROOT ?= .

# make promote RUN_DIR=<path> SLUG=<slug>
# Moves /data/run/.../SLUG.yaml to /data/opportunities/SLUG.yaml
promote:
	mv "$(RUN_DIR)/$(SLUG).yaml" "$(REPO_ROOT)/data/opportunities/$(SLUG).yaml"

# make shelve RUN_DIR=<path>
# Moves all .yaml files from RUN_DIR to /data/candidates/
shelve:
	find "$(RUN_DIR)" -maxdepth 1 -name "*.yaml" -exec mv {} "$(REPO_ROOT)/data/candidates/" \;

# make log RUN_DIR=<path> MSG=<message>
# Appends a timestamped log entry to RUN_DIR/run.log
log:
	@mkdir -p "$(RUN_DIR)"
	@echo "[$(shell date -u +%FT%TZ)] $(MSG)" >> "$(RUN_DIR)/run.log"

# make persist-company DEST_DIR=<path> SLUG=<slug> COMPANY=<name>
# Writes a skeleton YAML to DEST_DIR/SLUG.yaml. Only writes if file does not exist.
persist-company:
	@test ! -f "$(DEST_DIR)/$(SLUG).yaml" || (echo "$(DEST_DIR)/$(SLUG).yaml already exists, skipping" && exit 0)
	@mkdir -p "$(DEST_DIR)"
	@printf 'company: "%s"\nterse: null\nrole: null\nstage: null\nlocation: null\nemployees: null\ncompensation: null\nexcitement: null\ncompany_quality: null\nrecruiter_type: null\ncontact: null\nlink: null\nlast_outreach: null\nnotes: null\ndetails: null\nvote: null\nai_category: null\n' \
		"$(COMPANY)" > "$(DEST_DIR)/$(SLUG).yaml"

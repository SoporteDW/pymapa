CREATE POLICY "evidence_select_members"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'evidence'
  AND private.is_organization_member(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "evidence_insert_members"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'evidence'
  AND private.is_organization_member(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "evidence_update_members"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'evidence'
  AND private.is_organization_member(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'evidence'
  AND private.is_organization_member(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "evidence_delete_members"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'evidence'
  AND private.is_organization_member(((storage.foldername(name))[1])::uuid)
);
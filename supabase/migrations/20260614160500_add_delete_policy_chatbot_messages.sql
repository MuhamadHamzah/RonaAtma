-- Policy to allow students to delete their own chat messages
CREATE POLICY "delete_own_messages" ON chatbot_messages FOR DELETE
  TO authenticated USING (student_id = auth.uid());

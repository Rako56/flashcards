export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_concursos: {
        Row: {
          area: string | null
          banca: string | null
          cargo: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          data_prova: string | null
          descricao: string | null
          edital_filename: string | null
          edital_url: string | null
          estado: string | null
          estrutura_json: Json | null
          id: string
          nivel: string | null
          notas_internas: string | null
          orgao: string | null
          prioridade: number | null
          slug: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          banca?: string | null
          cargo?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          data_prova?: string | null
          descricao?: string | null
          edital_filename?: string | null
          edital_url?: string | null
          estado?: string | null
          estrutura_json?: Json | null
          id?: string
          nivel?: string | null
          notas_internas?: string | null
          orgao?: string | null
          prioridade?: number | null
          slug?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          banca?: string | null
          cargo?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          data_prova?: string | null
          descricao?: string | null
          edital_filename?: string | null
          edital_url?: string | null
          estado?: string | null
          estrutura_json?: Json | null
          id?: string
          nivel?: string | null
          notas_internas?: string | null
          orgao?: string | null
          prioridade?: number | null
          slug?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_disciplinas: {
        Row: {
          concurso_id: string
          created_at: string
          dificuldade_padrao: string | null
          id: string
          notas: string | null
          order_index: number
          peso: number | null
          title: string
          total_questoes: number | null
          updated_at: string
        }
        Insert: {
          concurso_id: string
          created_at?: string
          dificuldade_padrao?: string | null
          id?: string
          notas?: string | null
          order_index?: number
          peso?: number | null
          title: string
          total_questoes?: number | null
          updated_at?: string
        }
        Update: {
          concurso_id?: string
          created_at?: string
          dificuldade_padrao?: string | null
          id?: string
          notas?: string | null
          order_index?: number
          peso?: number | null
          title?: string
          total_questoes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_disciplinas_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "admin_concursos"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_flashcards: {
        Row: {
          back_text: string
          concurso_id: string | null
          created_at: string
          dica_pegadinha: string | null
          dificuldade: string | null
          disciplina_id: string | null
          disciplina_titulo: string | null
          explicacao_detalhada: string | null
          extras: Json | null
          front_text: string
          fundamento_legal: string | null
          id: string
          language_code: string | null
          legislacao_ref: string | null
          palavras_chave: string[] | null
          quality_audit_status: string | null
          quality_flags: string[] | null
          quality_reviewed_at: string | null
          quality_reviewer_notes: string | null
          quality_score: number | null
          quality_suggested_back: string | null
          quality_suggested_front: string | null
          questao_id: string | null
          review_notes: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_pipeline: string | null
          status: string
          tags: string[] | null
          tipo_card: string
          topico_id: string | null
          topico_titulo: string | null
          updated_at: string
        }
        Insert: {
          back_text: string
          concurso_id?: string | null
          created_at?: string
          dica_pegadinha?: string | null
          dificuldade?: string | null
          disciplina_id?: string | null
          disciplina_titulo?: string | null
          explicacao_detalhada?: string | null
          extras?: Json | null
          front_text: string
          fundamento_legal?: string | null
          id?: string
          language_code?: string | null
          legislacao_ref?: string | null
          palavras_chave?: string[] | null
          quality_audit_status?: string | null
          quality_flags?: string[] | null
          quality_reviewed_at?: string | null
          quality_reviewer_notes?: string | null
          quality_score?: number | null
          quality_suggested_back?: string | null
          quality_suggested_front?: string | null
          questao_id?: string | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_pipeline?: string | null
          status?: string
          tags?: string[] | null
          tipo_card?: string
          topico_id?: string | null
          topico_titulo?: string | null
          updated_at?: string
        }
        Update: {
          back_text?: string
          concurso_id?: string | null
          created_at?: string
          dica_pegadinha?: string | null
          dificuldade?: string | null
          disciplina_id?: string | null
          disciplina_titulo?: string | null
          explicacao_detalhada?: string | null
          extras?: Json | null
          front_text?: string
          fundamento_legal?: string | null
          id?: string
          language_code?: string | null
          legislacao_ref?: string | null
          palavras_chave?: string[] | null
          quality_audit_status?: string | null
          quality_flags?: string[] | null
          quality_reviewed_at?: string | null
          quality_reviewer_notes?: string | null
          quality_score?: number | null
          quality_suggested_back?: string | null
          quality_suggested_front?: string | null
          questao_id?: string | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_pipeline?: string | null
          status?: string
          tags?: string[] | null
          tipo_card?: string
          topico_id?: string | null
          topico_titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_flashcards_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "admin_concursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_flashcards_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "admin_disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_flashcards_questao_id_fkey"
            columns: ["questao_id"]
            isOneToOne: false
            referencedRelation: "admin_questoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_flashcards_topico_id_fkey"
            columns: ["topico_id"]
            isOneToOne: false
            referencedRelation: "admin_topicos"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_import_logs: {
        Row: {
          concurso_id: string | null
          created_at: string
          created_by: string | null
          error_count: number
          errors_json: Json | null
          id: string
          success_count: number
          tipo: string
          total_items: number
        }
        Insert: {
          concurso_id?: string | null
          created_at?: string
          created_by?: string | null
          error_count?: number
          errors_json?: Json | null
          id?: string
          success_count?: number
          tipo: string
          total_items?: number
        }
        Update: {
          concurso_id?: string | null
          created_at?: string
          created_by?: string | null
          error_count?: number
          errors_json?: Json | null
          id?: string
          success_count?: number
          tipo?: string
          total_items?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_import_logs_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "admin_concursos"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_midias: {
        Row: {
          categoria: string | null
          concurso_id: string
          created_at: string
          disciplina_id: string | null
          file_name: string
          file_url: string
          id: string
          notas: string | null
          topico_id: string | null
        }
        Insert: {
          categoria?: string | null
          concurso_id: string
          created_at?: string
          disciplina_id?: string | null
          file_name: string
          file_url: string
          id?: string
          notas?: string | null
          topico_id?: string | null
        }
        Update: {
          categoria?: string | null
          concurso_id?: string
          created_at?: string
          disciplina_id?: string | null
          file_name?: string
          file_url?: string
          id?: string
          notas?: string | null
          topico_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_midias_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "admin_concursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_midias_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "admin_disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_midias_topico_id_fkey"
            columns: ["topico_id"]
            isOneToOne: false
            referencedRelation: "admin_topicos"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_questoes: {
        Row: {
          alternativas: Json | null
          ano: number | null
          anulada: boolean
          banca: string | null
          cargo_origem: string | null
          classificado_por: string | null
          concurso_id: string | null
          created_at: string
          depende_visual: boolean
          dificuldade: string | null
          disciplina_id: string | null
          disciplina_sugerida: string | null
          enunciado: string
          explicacao: string | null
          flashcards_count: number
          flashcards_generated: boolean
          flashcards_generated_at: string | null
          fonte: string | null
          gabarito: string | null
          id: string
          notas_internas: string | null
          prova_origem: string | null
          status: string
          subtopico_id: string | null
          tags: string[] | null
          tipo_questao: string
          tipo_visual: string | null
          topico_id: string | null
          updated_at: string
          url_imagem_original: string | null
        }
        Insert: {
          alternativas?: Json | null
          ano?: number | null
          anulada?: boolean
          banca?: string | null
          cargo_origem?: string | null
          classificado_por?: string | null
          concurso_id?: string | null
          created_at?: string
          depende_visual?: boolean
          dificuldade?: string | null
          disciplina_id?: string | null
          disciplina_sugerida?: string | null
          enunciado: string
          explicacao?: string | null
          flashcards_count?: number
          flashcards_generated?: boolean
          flashcards_generated_at?: string | null
          fonte?: string | null
          gabarito?: string | null
          id?: string
          notas_internas?: string | null
          prova_origem?: string | null
          status?: string
          subtopico_id?: string | null
          tags?: string[] | null
          tipo_questao?: string
          tipo_visual?: string | null
          topico_id?: string | null
          updated_at?: string
          url_imagem_original?: string | null
        }
        Update: {
          alternativas?: Json | null
          ano?: number | null
          anulada?: boolean
          banca?: string | null
          cargo_origem?: string | null
          classificado_por?: string | null
          concurso_id?: string | null
          created_at?: string
          depende_visual?: boolean
          dificuldade?: string | null
          disciplina_id?: string | null
          disciplina_sugerida?: string | null
          enunciado?: string
          explicacao?: string | null
          flashcards_count?: number
          flashcards_generated?: boolean
          flashcards_generated_at?: string | null
          fonte?: string | null
          gabarito?: string | null
          id?: string
          notas_internas?: string | null
          prova_origem?: string | null
          status?: string
          subtopico_id?: string | null
          tags?: string[] | null
          tipo_questao?: string
          tipo_visual?: string | null
          topico_id?: string | null
          updated_at?: string
          url_imagem_original?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_questoes_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "admin_concursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_questoes_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "admin_disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_questoes_subtopico_id_fkey"
            columns: ["subtopico_id"]
            isOneToOne: false
            referencedRelation: "admin_topicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_questoes_topico_id_fkey"
            columns: ["topico_id"]
            isOneToOne: false
            referencedRelation: "admin_topicos"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_topicos: {
        Row: {
          created_at: string
          disciplina_id: string
          id: string
          notas: string | null
          order_index: number
          parent_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disciplina_id: string
          id?: string
          notas?: string | null
          order_index?: number
          parent_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disciplina_id?: string
          id?: string
          notas?: string | null
          order_index?: number
          parent_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_topicos_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "admin_disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_topicos_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "admin_topicos"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          correlation_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          correlation_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          correlation_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      card_reports: {
        Row: {
          card_id: string
          created_at: string
          id: string
          reason: string | null
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_reports_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "admin_flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          ano: number | null
          banca: string | null
          body: string | null
          content_type: string
          created_at: string
          created_by: string | null
          data_json: Json | null
          difficulty: string | null
          id: string
          source: string | null
          source_ref: string | null
          status: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
        }
        Insert: {
          ano?: number | null
          banca?: string | null
          body?: string | null
          content_type: string
          created_at?: string
          created_by?: string | null
          data_json?: Json | null
          difficulty?: string | null
          id?: string
          source?: string | null
          source_ref?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          ano?: number | null
          banca?: string | null
          body?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          data_json?: Json | null
          difficulty?: string | null
          id?: string
          source?: string | null
          source_ref?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          challenge_type: string
          completed: boolean
          completed_at: string | null
          context_label: string | null
          created_at: string
          current_value: number
          expires_at: string
          id: string
          period: string
          points_reward: number
          target_value: number
          user_id: string
        }
        Insert: {
          challenge_type: string
          completed?: boolean
          completed_at?: string | null
          context_label?: string | null
          created_at?: string
          current_value?: number
          expires_at: string
          id?: string
          period?: string
          points_reward?: number
          target_value?: number
          user_id: string
        }
        Update: {
          challenge_type?: string
          completed?: boolean
          completed_at?: string | null
          context_label?: string | null
          created_at?: string
          current_value?: number
          expires_at?: string
          id?: string
          period?: string
          points_reward?: number
          target_value?: number
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          break_duration: number
          created_at: string
          ended_at: string | null
          focus_duration: number
          goal_id: string | null
          id: string
          long_break_duration: number
          material_ref: string | null
          material_type: string | null
          pomodoros_completed: number
          pomodoros_target: number
          started_at: string | null
          status: string
          subject_id: string | null
          support_media_type: string | null
          support_media_value: string | null
          timer_mode: string
          topic_id: string | null
          total_focus_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          break_duration?: number
          created_at?: string
          ended_at?: string | null
          focus_duration?: number
          goal_id?: string | null
          id?: string
          long_break_duration?: number
          material_ref?: string | null
          material_type?: string | null
          pomodoros_completed?: number
          pomodoros_target?: number
          started_at?: string | null
          status?: string
          subject_id?: string | null
          support_media_type?: string | null
          support_media_value?: string | null
          timer_mode?: string
          topic_id?: string | null
          total_focus_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          break_duration?: number
          created_at?: string
          ended_at?: string | null
          focus_duration?: number
          goal_id?: string | null
          id?: string
          long_break_duration?: number
          material_ref?: string | null
          material_type?: string | null
          pomodoros_completed?: number
          pomodoros_target?: number
          started_at?: string | null
          status?: string
          subject_id?: string | null
          support_media_type?: string | null
          support_media_value?: string | null
          timer_mode?: string
          topic_id?: string | null
          total_focus_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          cover_url: string | null
          created_at: string
          details_json: Json | null
          exam_context: Json | null
          goal_type: string
          id: string
          status: string | null
          target_date: string | null
          title: string
          track_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          details_json?: Json | null
          exam_context?: Json | null
          goal_type?: string
          id?: string
          status?: string | null
          target_date?: string | null
          title: string
          track_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          details_json?: Json | null
          exam_context?: Json | null
          goal_type?: string
          id?: string
          status?: string | null
          target_date?: string | null
          title?: string
          track_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_audit_log: {
        Row: {
          acting_role: string
          acting_user_id: string | null
          data_subject_id: string | null
          event_type: string
          id: string
          legal_basis: string | null
          metadata: Json
          recorded_at: string
        }
        Insert: {
          acting_role: string
          acting_user_id?: string | null
          data_subject_id?: string | null
          event_type: string
          id?: string
          legal_basis?: string | null
          metadata?: Json
          recorded_at?: string
        }
        Update: {
          acting_role?: string
          acting_user_id?: string | null
          data_subject_id?: string | null
          event_type?: string
          id?: string
          legal_basis?: string | null
          metadata?: Json
          recorded_at?: string
        }
        Relationships: []
      }
      lgpd_deletion_requests: {
        Row: {
          completed_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          id: string
          processing_notes: string | null
          reason: string | null
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          id?: string
          processing_notes?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          id?: string
          processing_notes?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      mistake_notebook: {
        Row: {
          admin_questao_id: string | null
          content_item_id: string
          correct_answer: string | null
          created_at: string
          goal_id: string | null
          id: string
          last_reviewed_at: string | null
          notes: string | null
          question_attempt_id: string | null
          reviewed_count: number | null
          status: string | null
          subject_id: string | null
          topic_id: string | null
          updated_at: string
          user_answer: string | null
          user_id: string
        }
        Insert: {
          admin_questao_id?: string | null
          content_item_id: string
          correct_answer?: string | null
          created_at?: string
          goal_id?: string | null
          id?: string
          last_reviewed_at?: string | null
          notes?: string | null
          question_attempt_id?: string | null
          reviewed_count?: number | null
          status?: string | null
          subject_id?: string | null
          topic_id?: string | null
          updated_at?: string
          user_answer?: string | null
          user_id: string
        }
        Update: {
          admin_questao_id?: string | null
          content_item_id?: string
          correct_answer?: string | null
          created_at?: string
          goal_id?: string | null
          id?: string
          last_reviewed_at?: string | null
          notes?: string | null
          question_attempt_id?: string | null
          reviewed_count?: number | null
          status?: string | null
          subject_id?: string | null
          topic_id?: string | null
          updated_at?: string
          user_answer?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mistake_notebook_admin_questao_id_fkey"
            columns: ["admin_questao_id"]
            isOneToOne: false
            referencedRelation: "admin_questoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mistake_notebook_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mistake_notebook_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mistake_notebook_question_attempt_id_fkey"
            columns: ["question_attempt_id"]
            isOneToOne: false
            referencedRelation: "question_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount: number
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          billing_type: string
          concurso_id: string
          created_at: string
          id: string
          paid_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          billing_type: string
          concurso_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          billing_type?: string
          concurso_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "admin_concursos"
            referencedColumns: ["id"]
          },
        ]
      }
      question_attempts: {
        Row: {
          admin_questao_id: string | null
          answer: string | null
          content_item_id: string
          created_at: string
          goal_id: string | null
          id: string
          is_correct: boolean
          subject_id: string | null
          time_seconds: number | null
          topic_id: string | null
          user_id: string
        }
        Insert: {
          admin_questao_id?: string | null
          answer?: string | null
          content_item_id: string
          created_at?: string
          goal_id?: string | null
          id?: string
          is_correct: boolean
          subject_id?: string | null
          time_seconds?: number | null
          topic_id?: string | null
          user_id: string
        }
        Update: {
          admin_questao_id?: string | null
          answer?: string | null
          content_item_id?: string
          created_at?: string
          goal_id?: string | null
          id?: string
          is_correct?: boolean
          subject_id?: string | null
          time_seconds?: number | null
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_attempts_admin_questao_id_fkey"
            columns: ["admin_questao_id"]
            isOneToOne: false
            referencedRelation: "admin_questoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_attempts_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_attempts_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          admin_notes: string | null
          concurso_slug: string | null
          cpf_digits: string | null
          created_at: string
          email: string
          id: string
          motivo: string
          processed_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          concurso_slug?: string | null
          cpf_digits?: string | null
          created_at?: string
          email: string
          id?: string
          motivo: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          concurso_slug?: string | null
          cpf_digits?: string | null
          created_at?: string
          email?: string
          id?: string
          motivo?: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      simulados: {
        Row: {
          created_at: string
          description: string | null
          difficulty_filter: string | null
          discipline_filter: Json | null
          finished_at: string | null
          goal_id: string | null
          id: string
          question_ids: string[]
          results_json: Json | null
          started_at: string | null
          status: string
          time_limit_minutes: number | null
          time_spent_seconds: number | null
          title: string
          total_answered: number | null
          total_correct: number | null
          total_questions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty_filter?: string | null
          discipline_filter?: Json | null
          finished_at?: string | null
          goal_id?: string | null
          id?: string
          question_ids?: string[]
          results_json?: Json | null
          started_at?: string | null
          status?: string
          time_limit_minutes?: number | null
          time_spent_seconds?: number | null
          title: string
          total_answered?: number | null
          total_correct?: number | null
          total_questions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty_filter?: string | null
          discipline_filter?: Json | null
          finished_at?: string | null
          goal_id?: string | null
          id?: string
          question_ids?: string[]
          results_json?: Json | null
          started_at?: string | null
          status?: string
          time_limit_minutes?: number | null
          time_spent_seconds?: number | null
          title?: string
          total_answered?: number | null
          total_correct?: number | null
          total_questions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulados_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      srs_reviews: {
        Row: {
          card_source: string
          flashcard_id: string | null
          id: string
          rating: string
          reviewed_at: string
          seconds_spent: number | null
          user_id: string
        }
        Insert: {
          card_source: string
          flashcard_id?: string | null
          id?: string
          rating: string
          reviewed_at?: string
          seconds_spent?: number | null
          user_id: string
        }
        Update: {
          card_source?: string
          flashcard_id?: string | null
          id?: string
          rating?: string
          reviewed_at?: string
          seconds_spent?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "srs_reviews_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "admin_flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      study_logs: {
        Row: {
          count_in_plan: boolean | null
          created_at: string
          duration_minutes: number
          ended_at: string | null
          focus_session_id: string | null
          goal_id: string | null
          id: string
          material_ref: string | null
          material_type: string | null
          notes: string | null
          pages_read: number | null
          questions_correct: number | null
          questions_done: number | null
          schedule_review: boolean | null
          source: string | null
          started_at: string | null
          study_type: string
          subject_id: string | null
          theory_completed: boolean | null
          title: string | null
          topic_id: string | null
          updated_at: string
          user_id: string
          videos_watched: number | null
        }
        Insert: {
          count_in_plan?: boolean | null
          created_at?: string
          duration_minutes?: number
          ended_at?: string | null
          focus_session_id?: string | null
          goal_id?: string | null
          id?: string
          material_ref?: string | null
          material_type?: string | null
          notes?: string | null
          pages_read?: number | null
          questions_correct?: number | null
          questions_done?: number | null
          schedule_review?: boolean | null
          source?: string | null
          started_at?: string | null
          study_type?: string
          subject_id?: string | null
          theory_completed?: boolean | null
          title?: string | null
          topic_id?: string | null
          updated_at?: string
          user_id: string
          videos_watched?: number | null
        }
        Update: {
          count_in_plan?: boolean | null
          created_at?: string
          duration_minutes?: number
          ended_at?: string | null
          focus_session_id?: string | null
          goal_id?: string | null
          id?: string
          material_ref?: string | null
          material_type?: string | null
          notes?: string | null
          pages_read?: number | null
          questions_correct?: number | null
          questions_done?: number | null
          schedule_review?: boolean | null
          source?: string | null
          started_at?: string | null
          study_type?: string
          subject_id?: string | null
          theory_completed?: boolean | null
          title?: string | null
          topic_id?: string | null
          updated_at?: string
          user_id?: string
          videos_watched?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_logs_focus_session_id_fkey"
            columns: ["focus_session_id"]
            isOneToOne: false
            referencedRelation: "focus_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_logs_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          concurso_key: string | null
          created_at: string | null
          days_per_week: number | null
          goal_id: string | null
          hours_per_day: number | null
          id: string
          level: string | null
          plan_data: Json | null
          rhythm: string | null
          target_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          concurso_key?: string | null
          created_at?: string | null
          days_per_week?: number | null
          goal_id?: string | null
          hours_per_day?: number | null
          id?: string
          level?: string | null
          plan_data?: Json | null
          rhythm?: string | null
          target_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          concurso_key?: string | null
          created_at?: string | null
          days_per_week?: number | null
          goal_id?: string | null
          hours_per_day?: number | null
          id?: string
          level?: string | null
          plan_data?: Json | null
          rhythm?: string | null
          target_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plans_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          context_json: Json | null
          created_at: string
          goal_id: string | null
          id: string
          requested_outputs: string[]
          source_label: string | null
          source_type: string
          source_value: string | null
          status: string
          subject_id: string | null
          title: string
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_json?: Json | null
          created_at?: string
          goal_id?: string | null
          id?: string
          requested_outputs?: string[]
          source_label?: string | null
          source_type?: string
          source_value?: string | null
          status?: string
          subject_id?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_json?: Json | null
          created_at?: string
          goal_id?: string | null
          id?: string
          requested_outputs?: string[]
          source_label?: string | null
          source_type?: string
          source_value?: string | null
          status?: string
          subject_id?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions_rich: {
        Row: {
          accuracy: number
          concurso_id: string | null
          correct_count: number
          created_at: string
          disciplines: Json
          duration_ms: number
          ended_at: string
          flow_ms: number
          id: string
          incorrect_count: number
          max_combo: number
          outcomes_json: Json | null
          started_at: string
          total_bonus_xp: number
          total_xp: number
          user_id: string
        }
        Insert: {
          accuracy?: number
          concurso_id?: string | null
          correct_count?: number
          created_at?: string
          disciplines?: Json
          duration_ms: number
          ended_at?: string
          flow_ms?: number
          id?: string
          incorrect_count?: number
          max_combo?: number
          outcomes_json?: Json | null
          started_at: string
          total_bonus_xp?: number
          total_xp?: number
          user_id: string
        }
        Update: {
          accuracy?: number
          concurso_id?: string | null
          correct_count?: number
          created_at?: string
          disciplines?: Json
          duration_ms?: number
          ended_at?: string
          flow_ms?: number
          id?: string
          incorrect_count?: number
          max_combo?: number
          outcomes_json?: Json | null
          started_at?: string
          total_bonus_xp?: number
          total_xp?: number
          user_id?: string
        }
        Relationships: []
      }
      user_concurso_access: {
        Row: {
          concurso_id: string
          expires_at: string | null
          granted_at: string
          granted_by: string
          id: string
          plan: string
          purchase_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          concurso_id: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string
          id?: string
          plan?: string
          purchase_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          concurso_id?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string
          id?: string
          plan?: string
          purchase_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_concurso_access_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "admin_concursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_concurso_access_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      user_exam_targets: {
        Row: {
          concurso_id: string
          created_at: string
          daily_new_cards: number | null
          daily_review_cards: number | null
          id: string
          is_primary: boolean
          notes: string | null
          status: string
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          concurso_id: string
          created_at?: string
          daily_new_cards?: number | null
          daily_review_cards?: number | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          concurso_id?: string
          created_at?: string
          daily_new_cards?: number | null
          daily_review_cards?: number | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_exam_targets_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "admin_concursos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_flashcard_progress: {
        Row: {
          created_at: string
          difficulty: number | null
          due_at: string | null
          first_seen_at: string | null
          flashcard_id: string
          id: string
          interval_days: number
          lapses: number
          last_reviewed_at: string | null
          repetitions: number
          stability: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: number | null
          due_at?: string | null
          first_seen_at?: string | null
          flashcard_id: string
          id?: string
          interval_days?: number
          lapses?: number
          last_reviewed_at?: string | null
          repetitions?: number
          stability?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: number | null
          due_at?: string | null
          first_seen_at?: string | null
          flashcard_id?: string
          id?: string
          interval_days?: number
          lapses?: number
          last_reviewed_at?: string | null
          repetitions?: number
          stability?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_flashcard_progress_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "admin_flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_flashcard_reviews: {
        Row: {
          flashcard_id: string
          id: string
          rating: string
          reviewed_at: string
          seconds_spent: number | null
          user_id: string
        }
        Insert: {
          flashcard_id: string
          id?: string
          rating: string
          reviewed_at?: string
          seconds_spent?: number | null
          user_id: string
        }
        Update: {
          flashcard_id?: string
          id?: string
          rating?: string
          reviewed_at?: string
          seconds_spent?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_flashcard_reviews_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "admin_flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_gamification: {
        Row: {
          last_shield_at: number
          streak_protected_date: string | null
          streak_shields: number
          total_xp: number
          user_id: string
        }
        Insert: {
          last_shield_at?: number
          streak_protected_date?: string | null
          streak_shields?: number
          total_xp?: number
          user_id: string
        }
        Update: {
          last_shield_at?: number
          streak_protected_date?: string | null
          streak_shields?: number
          total_xp?: number
          user_id?: string
        }
        Relationships: []
      }
      user_leagues: {
        Row: {
          created_at: string
          league: string
          promoted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          league?: string
          promoted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          league?: string
          promoted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notes: {
        Row: {
          content: string | null
          content_json: Json | null
          created_at: string
          id: string
          pinned: boolean | null
          source_id: string | null
          source_type: string | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          content_json?: Json | null
          created_at?: string
          id?: string
          pinned?: boolean | null
          source_id?: string | null
          source_type?: string | null
          tags?: string[] | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          content_json?: Json | null
          created_at?: string
          id?: string
          pinned?: boolean | null
          source_id?: string | null
          source_type?: string | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          asaas_customer_id: string | null
          avatar_url: string | null
          cpf: string | null
          created_at: string
          daily_goal_minutes: number
          default_new_per_day: number
          default_session_size: number
          full_name: string | null
          id: string
          phone_display: string | null
          phone_e164: string | null
          phone_verified: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          asaas_customer_id?: string | null
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          daily_goal_minutes?: number
          default_new_per_day?: number
          default_session_size?: number
          full_name?: string | null
          id?: string
          phone_display?: string | null
          phone_e164?: string | null
          phone_verified?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          asaas_customer_id?: string | null
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          daily_goal_minutes?: number
          default_new_per_day?: number
          default_session_size?: number
          full_name?: string | null
          id?: string
          phone_display?: string | null
          phone_e164?: string | null
          phone_verified?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance_earned: number
          balance_purchased: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_earned?: number
          balance_purchased?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_earned?: number
          balance_purchased?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          event_id: string
          event_type: string
          payload: Json
          processed_at: string | null
          processed_status: string
          processing_error: string | null
          received_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          payload: Json
          processed_at?: string | null
          processed_status?: string
          processing_error?: string | null
          received_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          payload?: Json
          processed_at?: string | null
          processed_status?: string
          processing_error?: string | null
          received_at?: string
        }
        Relationships: []
      }
      weekly_scores: {
        Row: {
          concurso_id: string | null
          created_at: string
          id: string
          points: number
          reviews_count: number
          streak_days: number
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          concurso_id?: string | null
          created_at?: string
          id?: string
          points?: number
          reviews_count?: number
          streak_days?: number
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          concurso_id?: string | null
          created_at?: string
          id?: string
          points?: number
          reviews_count?: number
          streak_days?: number
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_scores_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "admin_concursos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_audit_suggestion: {
        Args: { p_card_id: string; p_source: string }
        Returns: Json
      }
      approve_flashcard_review: {
        Args: { p_card_id: string; p_notes?: string }
        Returns: {
          id: string
          review_status: string
          reviewed_at: string
          status: string
        }[]
      }
      approve_flashcard_review_with_edit: {
        Args: {
          p_back_text: string
          p_card_id: string
          p_dica_pegadinha: string
          p_dificuldade: string
          p_explicacao_detalhada: string
          p_front_text: string
          p_fundamento_legal: string
          p_notes?: string
          p_topico_titulo: string
        }
        Returns: {
          id: string
          review_status: string
          reviewed_at: string
          status: string
        }[]
      }
      award_review_points: { Args: { p_rating: string }; Returns: undefined }
      batch_save_reviews: { Args: { p_reviews: Json }; Returns: undefined }
      delete_audit_card: {
        Args: { p_card_id: string; p_source: string }
        Returns: Json
      }
      delete_user_cascade: { Args: { p_user_id: string }; Returns: Json }
      ensure_flash_balance: {
        Args: { p_allowance?: number }
        Returns: {
          balance: number
          last_recharged_at: string
          monthly_allowance: number
        }[]
      }
      exam_target_pace: {
        Args: { target_id: string }
        Returns: {
          days_remaining: number
          pace_ratio: number
          topics_expected: number
          topics_seen: number
          topics_total: number
        }[]
      }
      flashcard_heuristic_flags: {
        Args: { back: string; front: string }
        Returns: string[]
      }
      get_content_counts: { Args: { p_concurso_id?: string }; Returns: Json }
      get_review_queue_stats: { Args: never; Returns: Json }
      get_weekly_leaderboard: {
        Args: { p_concurso_id: string; p_limit?: number; p_week_start: string }
        Returns: {
          avatar_url: string
          full_name: string
          league: string
          points: number
          reviews_count: number
          streak_days: number
          user_id: string
        }[]
      }
      grant_concurso_access: {
        Args: {
          p_concurso_slug: string
          p_duration_days?: number
          p_plan: string
          p_purchase_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_webhook_event: {
        Args: { p_event_id: string; p_event_type: string; p_payload: Json }
        Returns: {
          returned_event_id: string
          was_new: boolean
        }[]
      }
      refresh_bot_weekly_scores: { Args: never; Returns: undefined }
      reject_audit_suggestion: {
        Args: { p_card_id: string; p_source: string }
        Returns: Json
      }
      reject_flashcard_review: {
        Args: { p_card_id: string; p_reason: string }
        Returns: {
          id: string
          review_status: string
          reviewed_at: string
          status: string
        }[]
      }
      report_flashcard:
        | { Args: { p_card_id: string }; Returns: undefined }
        | { Args: { p_card_id: string; p_reason?: string }; Returns: undefined }
      run_flashcard_heuristic_audit: { Args: never; Returns: Json }
      spend_flashs_ai: {
        Args: { p_cost: number; p_ref: string }
        Returns: boolean
      }
      spend_flashs_clone_deck: {
        Args: { p_cost: number; p_deck_id: string }
        Returns: string
      }
      switch_active_goal: { Args: { p_goal_id: string }; Returns: undefined }
      triage_flagged_card: {
        Args: { p_action: string; p_card_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

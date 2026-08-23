import type { Pool } from "pg";
import type { DueReminder, ReminderKind, ReminderStore, SendStatus } from "./types.js";

/**
 * As consultas do serviço. SQL cru, de propósito.
 *
 * O serviço **não** importa nada de `web/`: os dois compartilham o banco e
 * nada mais. São cinco consultas; puxar o Drizzle e o schema para cá criaria
 * um acoplamento de build entre um app da Vercel e um worker que precisa
 * rodar em outro lugar, para economizar pouco.
 */
export class ReminderRepository implements ReminderStore {
  constructor(private readonly pool: Pool) {}

  /**
   * Quem está escalado, tem telefone, e ainda não recebeu este aviso.
   *
   * O recorte por data é grosso (`fromDate`/`toDate`); quem decide se já
   * venceu é o `ServiceClock`, porque a conta depende de fuso e nenhuma outra
   * classe faz aritmética de horário.
   *
   * Servo sem telefone é excluído aqui e **não** vira registro. Assim, se ele
   * cadastrar o número antes da hora do aviso, ainda recebe (RF03).
   */
  async findCandidates(kind: ReminderKind, fromDate: string, toDate: string): Promise<DueReminder[]> {
    const { rows } = await this.pool.query(
      `select sd.id            as date_id,
              sd.date::text    as service_date,
              sd.start_time::text as service_time,
              sv.id            as servant_id,
              u.name           as servant_name,
              u.phone          as phone,
              c.name           as church_name,
              m.name           as ministry_name,
              s.name           as sector_name,
              sch.name         as schedule_name
         from schedule_assignments sa
         join schedule_dates sd  on sd.id  = sa.date_id
         join schedules sch      on sch.id = sd.schedule_id
         join sectors s          on s.id   = sch.sector_id
         join ministries m       on m.id   = sch.ministry_id
         join churches c         on c.id   = m.church_id
         join servants sv        on sv.id  = sa.servant_id
         join users u            on u.id   = sv.user_id
         left join notification_log nl
                on nl.date_id = sd.id and nl.servant_id = sv.id and nl.kind = $1
        where sch.status = 'published'
          and u.phone is not null
          and nl.id is null
          and sd.date between $2::date and $3::date`,
      [kind, fromDate, toDate],
    );

    return rows.map((r) => ({
      dateId: Number(r.date_id),
      servantId: Number(r.servant_id),
      servantName: r.servant_name,
      phone: r.phone,
      churchName: r.church_name,
      ministryName: r.ministry_name,
      sectorName: r.sector_name,
      scheduleName: r.schedule_name,
      service: { date: r.service_date, time: r.service_time },
    }));
  }

  /**
   * Reserva o aviso antes de enviar. `null` = outra instância já pegou.
   *
   * Uma instrução só, atômica. O `do update ... where` reaproveita reserva
   * parada há mais de 5 minutos: é o conserto do único buraco desta ordem —
   * o processo morrer entre reservar e enviar. Cinco minutos cabem dentro da
   * janela de tolerância, então o aviso ainda sai na hora certa.
   */
  async claim(reminder: DueReminder, kind: ReminderKind): Promise<number | null> {
    const { rows } = await this.pool.query(
      `insert into notification_log (date_id, servant_id, kind, status)
            values ($1, $2, $3, 'pending')
       on conflict (date_id, servant_id, kind) do update
              set status = 'pending', sent_at = now()
            where notification_log.status = 'pending'
              and notification_log.sent_at < now() - interval '5 minutes'
        returning id`,
      [reminder.dateId, reminder.servantId, kind],
    );
    return rows.length > 0 ? Number(rows[0].id) : null;
  }

  async finish(claimId: number, status: SendStatus, detail?: string): Promise<void> {
    await this.pool.query(
      `update notification_log set status = $2, detail = $3, sent_at = now() where id = $1`,
      [claimId, status, detail ?? null],
    );
  }

  /** Para o `/health`: um `pending` acumulando é sinal de processo morrendo no meio. */
  async countByStatus(): Promise<Record<string, number>> {
    const { rows } = await this.pool.query(
      `select status, count(*)::int as n from notification_log group by status`,
    );
    return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
  }
}

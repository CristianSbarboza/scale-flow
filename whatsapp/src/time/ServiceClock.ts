/**
 * Toda a aritmética de data do serviço mora aqui. Nenhuma outra classe faz
 * conta com horário — é a regra que impede o defeito mais provável desta spec.
 *
 * O problema: `schedule_dates.date` e `start_time` não guardam fuso nenhum.
 * São hora de parede da igreja. Transformar isso em instante exige saber o
 * deslocamento do fuso **naquela data**, que não é constante: o Brasil
 * aboliu o horário de verão em 2019, mas isso pode voltar, e um cálculo com
 * `-03:00` fixo passaria a errar uma hora sem avisar ninguém.
 *
 * Por isso o deslocamento vem do `Intl`, que consulta a base IANA do runtime,
 * em vez de estar escrito no código.
 */

export interface Clock {
  now(): Date;
}

/** Data e hora de parede, como vêm do banco. */
export interface WallTime {
  /** `YYYY-MM-DD` */
  date: string;
  /** `HH:MM` ou `HH:MM:SS` */
  time: string;
}

export class ServiceClock implements Clock {
  constructor(private readonly timeZone: string) {}

  now(): Date {
    return new Date();
  }

  /** O fuso configurado. Quem formata data fora daqui precisa dele. */
  get timeZoneName(): string {
    return this.timeZone;
  }

  /**
   * Hora de parede no fuso da igreja → instante real.
   *
   * Duas passadas de propósito. A primeira chuta o deslocamento usando a hora
   * de parede como se fosse UTC; perto de uma virada de horário de verão esse
   * chute cai do lado errado da mudança e devolve o deslocamento antigo. A
   * segunda recalcula já no instante corrigido.
   */
  toInstant({ date, time }: WallTime): Date {
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);

    const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
    const primeiro = this.offsetMsAt(new Date(wallAsUtc));
    const candidato = wallAsUtc - primeiro;

    const segundo = this.offsetMsAt(new Date(candidato));
    return new Date(segundo === primeiro ? candidato : wallAsUtc - segundo);
  }

  /** Quando avisar quem serve em `service`, para cada tipo de lembrete. */
  dueAt(service: WallTime, kind: "day_before" | "two_hours"): Date {
    if (kind === "two_hours") {
      return new Date(this.toInstant(service).getTime() - 2 * 60 * 60 * 1000);
    }
    // Véspera às 09h **locais** — não "24h antes". Um culto às 19h e outro às
    // 07h do mesmo dia geram o mesmo horário de aviso, que é o esperado: o
    // lembrete de véspera é sobre o dia, não sobre a hora.
    return this.toInstant({ date: this.dayBefore(service.date), time: "09:00" });
  }

  /** Dia anterior no calendário. Vira mês e ano sozinho. */
  dayBefore(date: string): string {
    const [year, month, day] = date.split("-").map(Number);
    const anterior = new Date(Date.UTC(year, month - 1, day - 1));
    return anterior.toISOString().slice(0, 10);
  }

  /**
   * Deslocamento do fuso, em ms, no instante dado.
   *
   * Formata o instante como hora de parede naquele fuso e compara com o mesmo
   * relógio lido em UTC. A diferença é o deslocamento — e ele sai da base
   * IANA do runtime, não de uma constante.
   */
  private offsetMsAt(instant: Date): number {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: this.timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(instant);

    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    // `hour` pode vir "24" à meia-noite em alguns runtimes — daí o % 24.
    const wallAsUtc = Date.UTC(
      get("year"), get("month") - 1, get("day"),
      get("hour") % 24, get("minute"), get("second"),
    );
    return wallAsUtc - instant.getTime();
  }

  /**
   * Hora e data separadas, para a mensagem poder pôr cada uma em negrito.
   * Ex.: `{ hora: "19:00", data: "24/08 (domingo)" }`.
   */
  describeParts(wall: WallTime): { hora: string; data: string } {
    const instant = this.toInstant(wall);
    const fmt = new Intl.DateTimeFormat("pt-BR", {
      timeZone: this.timeZone,
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(instant);
    const get = (type: string) => fmt.find((p) => p.type === type)?.value ?? "";
    return {
      hora: `${get("hour")}:${get("minute")}`,
      data: `${get("day")}/${get("month")} (${get("weekday")})`,
    };
  }

  /** Hora de parede legível, numa linha só. Ex.: `24/08 (domingo) às 19:00`. */
  describe({ date, time }: WallTime): string {
    const instant = this.toInstant({ date, time });
    const fmt = new Intl.DateTimeFormat("pt-BR", {
      timeZone: this.timeZone,
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(instant);
    const get = (type: string) => fmt.find((p) => p.type === type)?.value ?? "";
    return `${get("day")}/${get("month")} (${get("weekday")}) às ${get("hour")}:${get("minute")}`;
  }
}

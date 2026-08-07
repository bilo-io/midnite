import{b0 as n,ax as R}from"./iframe-gFgXxWaR.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-CmLhaSr9.js";import{P as H}from"./project-modal-B_LLO1kl.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DNy2oEqD.js";import"./Select-ef7c0426.esm-CW9LmHfL.js";import"./chevron-down-Bps-R00h.js";import"./check-Dpc0Y1hE.js";import"./export-menu-AM3OCjm1.js";import"./client-Be_Arjw1.js";import"./markdown-preview-Cbi0ainU.js";import"./index.dom-D_wTd2ti.js";import"./copy-DY-TYTg9.js";import"./file-code-corner-Ca5uBXJK.js";import"./file-text-B4Y8SpDf.js";import"./loader-circle-tHDlx3pq.js";import"./api-DttCPlos.js";import"./folder-open-BvAocLf9.js";import"./folder-9iRFSHhi.js";import"./tag-color-picker-B-9PyFtu.js";import"./project-tag-D4rhD1m3.js";import"./sparkles-CwQ2C98J.js";import"./brain-BQTvW0ev.js";import"./chevron-right-C0zxYWyb.js";import"./markdown-editor-Cxvte1s6.js";import"./pencil-7wthU_jO.js";import"./trash-2-CPp24p8X.js";import"./templates-Dv9Z8i7T.js";import"./project-template-labels-IrNOqv34.js";import"./plus-CN97TpWE.js";import"./task-row-BaKqtjoa.js";import"./blocked-badge-Cr0L0u_X.js";import"./selectable-icon-D8TrI7Tu.js";import"./hover-expand-button-BbOIFyu9.js";import"./index-DKfmD3n_.js";import"./data-refresh-DSFC4rm2.js";import"./rotate-ccw-xEIiEQxg.js";import"./play-CkXwrFZB.js";import"./square-terminal-Db8tvKjj.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-l1Kfggq6.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(m=o.parameters)===null||m===void 0||(l=m.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=i.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(g=r.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const planTab = within(dialog).getByRole('tab', {
      name: /plan/i
    });
    await userEvent.click(planTab);
    await expect(planTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ha=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ha as __namedExportsOrder,ja as default};
